import { GitHubPRData } from "./types";

export function parsePRUrl(url: string): { owner: string; repo: string; prNumber: string; repoUrl: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com" || parsed.port || parsed.username || parsed.password) return null;

  const match = parsed.pathname.match(/^\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)\/pull\/([1-9]\d*)\/?$/);
  if (!match || match[2] === "." || match[2] === "..") return null;

  const [, owner, repo, prNumber] = match;
  return {
    owner,
    repo,
    prNumber,
    repoUrl: `https://github.com/${owner}/${repo}.git`
  };
}

export async function fetchGitHubPRData(owner: string, repo: string, prNumber: string, token?: string): Promise<GitHubPRData> {
  if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo) || repo === "." || repo === ".." || !/^[1-9]\d*$/.test(prNumber)) {
    throw new Error("Invalid GitHub PR coordinates");
  }
  const apiPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${prNumber}`;
  const apiUrl = (suffix = "") => new URL(`${apiPath}${suffix}`, "https://api.github.com");
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Pr-Review-Agent'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(apiUrl(), {
    headers,
    redirect: "error"
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const prData = await response.json() as GitHubPRData;

  // Fetch files data
  const filesResponse = await fetch(apiUrl("/files"), {
    headers,
    redirect: "error"
  });

  if (filesResponse.ok) {
    prData.files = await filesResponse.json() as Array<{
      filename: string;
      status: string;
      additions: number;
      deletions: number;
    }>;
  }

  // Fetch commits data
  const commitsResponse = await fetch(apiUrl("/commits"), {
    headers,
    redirect: "error"
  });

  if (commitsResponse.ok) {
    prData.commits_data = await commitsResponse.json() as Array<{
      sha: string;
      commit: { message: string };
    }>;
  }

  return prData;
}

export function formatPRMetadata(prData: GitHubPRData, prInfo: { owner: string; repo: string; prNumber: string }) {
  return `
PR METADATA FROM GITHUB:
- Title: ${prData.title}
- State: ${prData.state}
- Author: ${prData.user.login}
- Base repository: ${prData.base.repo.full_name}
- Base branch: ${prData.base.ref} (${prData.base.sha})
- Head repository: ${prData.head.repo ? prData.head.repo.full_name : 'Unknown (deleted fork)'}
- Head branch: ${prData.head.ref} (${prData.head.sha})
- Changes: +${prData.additions} -${prData.deletions} in ${prData.changed_files} files
- Commits: ${prData.commits}
${prData.head.repo && prData.head.repo.full_name !== prData.base.repo.full_name ? '- NOTE: This PR is from a fork' : ''}

CHANGED FILES:
${prData.files?.map(f => `- ${f.filename} (${f.status}, +${f.additions} -${f.deletions})`).join('\n') || 'No file data available'}

COMMITS:
${prData.commits_data?.map(c => `- ${c.sha.substring(0, 7)}: ${c.commit.message.split('\n')[0]}`).join('\n') || 'No commit data available'}

DESCRIPTION:
${prData.body || 'No description provided'}
`;
}
