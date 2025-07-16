import { GitHubPRData } from "./types";

export function parsePRUrl(url: string): { owner: string; repo: string; prNumber: string; repoUrl: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, prNumber] = match;
  return {
    owner,
    repo,
    prNumber,
    repoUrl: `https://github.com/${owner}/${repo}.git`
  };
}

export async function fetchGitHubPRData(owner: string, repo: string, prNumber: string, token?: string): Promise<GitHubPRData> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Pr-Review-Agent'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const prData = await response.json() as GitHubPRData;

  // Fetch files data
  const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
    headers
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
  const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/commits`, {
    headers
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
