export interface Stream {
  write: (data: string) => void;
  end: () => void;
}

export interface GitHubPRData {
  title: string;
  body: string;
  state: string;
  user: { login: string };
  base: {
    repo: { full_name: string };
    ref: string;
    sha: string;
  };
  head: {
    repo: { full_name: string; clone_url: string } | null;
    ref: string;
    sha: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  commits_data?: Array<{
    sha: string;
    commit: { message: string };
  }>;
}
