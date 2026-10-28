import { afterEach, expect, test } from "bun:test";
import { fetchGitHubPRData, parsePRUrl } from "../src/github";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("accepts only an HTTPS pull request on github.com", () => {
  expect(parsePRUrl("https://github.com/blaxel-ai/sandbox/pull/123?diff=split")).toEqual({
    owner: "blaxel-ai",
    repo: "sandbox",
    prNumber: "123",
    repoUrl: "https://github.com/blaxel-ai/sandbox.git"
  });
  for (const url of [
    "http://github.com/blaxel-ai/sandbox/pull/123",
    "https://github.com.evil.example/blaxel-ai/sandbox/pull/123",
    "https://evil.example/github.com/blaxel-ai/sandbox/pull/123",
    "https://user@github.com/blaxel-ai/sandbox/pull/123",
    "https://github.com:444/blaxel-ai/sandbox/pull/123",
    "https://github.com/blaxel-ai/sandbox/pull/123/extra",
    "https://github.com/blaxel-ai/sandbox%2Fother/pull/123",
    "https://github.com/blaxel-ai/sandbox/pull/123%2Ffiles"
  ]) {
    expect(parsePRUrl(url)).toBeNull();
  }
});

test("rejects unsafe coordinates before making a request", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("unexpected fetch"); };
  for (const [owner, repo, number] of [
    ["owner@evil.example", "repo", "1"],
    ["owner", "repo?redirect=evil", "1"],
    ["owner", "..", "1"],
    ["owner", "repo", "1/files"],
    ["owner", "repo", "0"]
  ]) {
    await expect(fetchGitHubPRData(owner, repo, number, "token")).rejects.toThrow("Invalid GitHub PR coordinates");
  }
  expect(calls).toBe(0);
});

test("requests only fixed GitHub API paths without following redirects", async () => {
  const requests: Array<{ url: string; options: RequestInit }> = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options: options ?? {} });
    return new Response(JSON.stringify({ title: "Test", user: { login: "owner" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  await fetchGitHubPRData("owner", "repo", "123", "token");
  expect(requests.map(request => request.url)).toEqual([
    "https://api.github.com/repos/owner/repo/pulls/123",
    "https://api.github.com/repos/owner/repo/pulls/123/files",
    "https://api.github.com/repos/owner/repo/pulls/123/commits"
  ]);
  for (const request of requests) {
    expect(request.options.redirect).toBe("error");
    expect((request.options.headers as Record<string, string>).Authorization).toBe("token token");
  }
});
