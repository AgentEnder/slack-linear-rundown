/**
 * GitHub API types and interfaces
 */

export interface GitHubClientConfig {
  token: string;
  /**
   * Optional custom GitHub API endpoint (for GitHub Enterprise)
   * Defaults to https://api.github.com
   */
  baseUrl?: string;
}

/**
 * GitHub Repository
 */
export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    node_id: string;
  };
  private: boolean;
  html_url: string;
  description?: string;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

/**
 * GitHub Pull Request
 */
export interface GitHubPullRequest {
  id: number;
  node_id: string;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  draft: boolean;
  user: {
    login: string;
    id: number;
    node_id: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  html_url: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  mergeable?: boolean;
  mergeable_state?: string;
  merged?: boolean;
  merged_by?: {
    login: string;
    id: number;
  };
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
}

/**
 * GitHub Issue
 */
export interface GitHubIssue {
  id: number;
  node_id: string;
  number: number;
  state: 'open' | 'closed';
  state_reason?: 'completed' | 'not_planned' | 'reopened';
  title: string;
  body?: string;
  user: {
    login: string;
    id: number;
    node_id: string;
  };
  assignee?: {
    login: string;
    id: number;
    node_id: string;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description?: string;
  }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  html_url: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  pull_request?: {
    url: string;
    html_url: string;
  };
}

/**
 * GitHub Code Review
 */
export interface GitHubReview {
  id: number;
  node_id: string;
  user: {
    login: string;
    id: number;
    node_id: string;
  };
  body?: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  html_url: string;
  pull_request_url: string;
  submitted_at: string;
}

/**
 * GitHub User Activity Summary
 */
export interface GitHubUserActivity {
  username: string;
  userId: number;
  since: Date;
  until: Date;
  pullRequests: {
    created: GitHubPullRequest[];
    merged: GitHubPullRequest[];
    active: GitHubPullRequest[];
  };
  issues: {
    created: GitHubIssue[];
    closed: GitHubIssue[];
    active: GitHubIssue[];
  };
  reviews: GitHubReview[];
  repositories: GitHubRepository[];
}

/**
 * Retry configuration for API calls
 */
export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

/**
 * Search query options for GitHub
 */
export interface GitHubSearchOptions {
  username: string;
  since?: Date;
  until?: Date;
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  perPage?: number;
}

/**
 * Repository activity filter options
 */
export interface RepositoryActivityOptions {
  owner: string;
  repo: string;
  username: string;
  since?: Date;
  until?: Date;
}
