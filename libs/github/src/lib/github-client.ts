/**
 * GitHub API Client
 *
 * Provides methods for fetching user activity, pull requests, issues, and reviews
 * from GitHub using Octokit with built-in retry logic and pagination support.
 */

import { Octokit } from '@octokit/rest';
import type {
  GitHubClientConfig,
  GitHubPullRequest,
  GitHubIssue,
  GitHubReview,
  GitHubRepository,
  GitHubUserActivity,
  GitHubSearchOptions,
  RepositoryActivityOptions,
  RetryOptions,
} from './types.js';

export class GitHubClient {
  private client: Octokit;
  private retryOptions: RetryOptions;

  constructor(config: GitHubClientConfig) {
    this.client = new Octokit({
      auth: config.token,
      baseUrl: config.baseUrl || 'https://api.github.com',
      userAgent: 'slack-linear-rundown',
      request: {
        timeout: 30000, // 30 seconds
      },
    });

    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    };
  }

  /**
   * Get authenticated user information
   */
  async getCurrentUser(): Promise<{ login: string; id: number; node_id: string }> {
    return this.withRetry(async () => {
      const { data } = await this.client.users.getAuthenticated();
      return {
        login: data.login,
        id: data.id,
        node_id: data.node_id,
      };
    });
  }

  /**
   * Get all repositories a user has contributed to recently
   * @param username - GitHub username
   * @param since - Start date for filtering (default: 90 days ago)
   */
  async getUserRepositories(
    username: string,
    since?: Date
  ): Promise<GitHubRepository[]> {
    const sinceDate = since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    return this.withRetry(async () => {
      const repositories: GitHubRepository[] = [];

      // Get repositories owned by user
      for await (const response of this.client.paginate.iterator(
        this.client.repos.listForUser,
        {
          username,
          sort: 'updated',
          per_page: 100,
        }
      )) {
        for (const repo of response.data) {
          const updatedAt = new Date(repo.updated_at);
          if (updatedAt >= sinceDate) {
            repositories.push(repo as GitHubRepository);
          }
        }
      }

      return repositories;
    });
  }

  /**
   * Get pull requests created by a user
   * @param username - GitHub username
   * @param options - Search options
   */
  async getUserPullRequests(
    username: string,
    options: Partial<GitHubSearchOptions> = {}
  ): Promise<GitHubPullRequest[]> {
    const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const state = options.state || 'all';

    return this.withRetry(async () => {
      const pullRequests: GitHubPullRequest[] = [];

      // Search for PRs authored by user
      const query = `author:${username} is:pr created:>=${since.toISOString().split('T')[0]}`;

      for await (const response of this.client.paginate.iterator(
        this.client.search.issuesAndPullRequests,
        {
          q: query,
          sort: 'updated',
          per_page: 100,
        }
      )) {
        for (const item of response.data) {
          if (item.pull_request) {
            // Fetch full PR details to get additions/deletions
            const [owner, repo] = item.repository_url.split('/').slice(-2);
            const prDetails = await this.getPullRequestDetails(owner, repo, item.number);

            if (state === 'all' || prDetails.state === state) {
              pullRequests.push(prDetails);
            }
          }
        }
      }

      return pullRequests;
    });
  }

  /**
   * Get detailed PR information including code stats
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - PR number
   */
  async getPullRequestDetails(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubPullRequest> {
    return this.withRetry(async () => {
      const { data } = await this.client.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return {
        id: data.id,
        node_id: data.node_id,
        number: data.number,
        state: data.state as 'open' | 'closed',
        title: data.title,
        body: data.body || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
        closed_at: data.closed_at || undefined,
        merged_at: data.merged_at || undefined,
        draft: data.draft || false,
        user: {
          login: data.user?.login || '',
          id: data.user?.id || 0,
          node_id: data.user?.node_id || '',
        },
        head: {
          ref: data.head.ref,
          sha: data.head.sha,
        },
        base: {
          ref: data.base.ref,
          sha: data.base.sha,
        },
        html_url: data.html_url,
        additions: data.additions,
        deletions: data.deletions,
        changed_files: data.changed_files,
        mergeable: data.mergeable || undefined,
        mergeable_state: data.mergeable_state || undefined,
        merged: data.merged || false,
        merged_by: data.merged_by
          ? {
              login: data.merged_by.login,
              id: data.merged_by.id,
            }
          : undefined,
        repository: {
          id: data.base.repo.id,
          name: data.base.repo.name,
          full_name: data.base.repo.full_name,
          owner: {
            login: data.base.repo.owner.login,
            id: data.base.repo.owner.id,
          },
        },
      } as GitHubPullRequest;
    });
  }

  /**
   * Get issues created by or assigned to a user
   * @param username - GitHub username
   * @param options - Search options
   */
  async getUserIssues(
    username: string,
    options: Partial<GitHubSearchOptions> = {}
  ): Promise<GitHubIssue[]> {
    const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const state = options.state || 'all';

    return this.withRetry(async () => {
      const issues: GitHubIssue[] = [];

      // Search for issues authored or assigned to user (excluding PRs)
      const query = `involves:${username} is:issue created:>=${since.toISOString().split('T')[0]}`;

      for await (const response of this.client.paginate.iterator(
        this.client.search.issuesAndPullRequests,
        {
          q: query,
          sort: 'updated',
          per_page: 100,
        }
      )) {
        for (const item of response.data) {
          if (!item.pull_request) {
            const [owner, repo] = item.repository_url.split('/').slice(-2);
            const issueDetails = await this.getIssueDetails(owner, repo, item.number);

            if (state === 'all' || issueDetails.state === state) {
              issues.push(issueDetails);
            }
          }
        }
      }

      return issues;
    });
  }

  /**
   * Get detailed issue information
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param issueNumber - Issue number
   */
  async getIssueDetails(
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<GitHubIssue> {
    return this.withRetry(async () => {
      const { data } = await this.client.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      });

      return {
        id: data.id,
        node_id: data.node_id,
        number: data.number,
        state: data.state as 'open' | 'closed',
        state_reason: data.state_reason as 'completed' | 'not_planned' | 'reopened' | undefined,
        title: data.title,
        body: data.body || undefined,
        user: {
          login: data.user?.login || '',
          id: data.user?.id || 0,
          node_id: data.user?.node_id || '',
        },
        assignee: data.assignee
          ? {
              login: data.assignee.login,
              id: data.assignee.id,
              node_id: data.assignee.node_id,
            }
          : undefined,
        labels: data.labels.map((label) => {
          if (typeof label === 'string') {
            return { id: 0, name: label, color: '', description: undefined };
          }
          return {
            id: label.id || 0,
            name: label.name || '',
            color: label.color || '',
            description: label.description || undefined,
          };
        }),
        created_at: data.created_at,
        updated_at: data.updated_at,
        closed_at: data.closed_at || undefined,
        html_url: data.html_url,
        repository: {
          id: 0, // Will be filled by caller
          name: repo,
          full_name: `${owner}/${repo}`,
          owner: {
            login: owner,
            id: 0, // Will be filled by caller
          },
        },
        pull_request: data.pull_request,
      } as GitHubIssue;
    });
  }

  /**
   * Get reviews given by a user
   * @param username - GitHub username
   * @param since - Start date for filtering
   */
  async getUserReviews(username: string, since?: Date): Promise<GitHubReview[]> {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return this.withRetry(async () => {
      const reviews: GitHubReview[] = [];

      // Search for PRs reviewed by user
      const query = `reviewed-by:${username} is:pr created:>=${sinceDate.toISOString().split('T')[0]}`;

      for await (const response of this.client.paginate.iterator(
        this.client.search.issuesAndPullRequests,
        {
          q: query,
          sort: 'updated',
          per_page: 100,
        }
      )) {
        for (const item of response.data) {
          if (item.pull_request) {
            const [owner, repo] = item.repository_url.split('/').slice(-2);

            // Get reviews for this PR
            const prReviews = await this.getPullRequestReviews(owner, repo, item.number);

            // Filter to only reviews by this user
            const userReviews = prReviews.filter(
              (review) => review.user.login === username && new Date(review.submitted_at) >= sinceDate
            );

            reviews.push(...userReviews);
          }
        }
      }

      return reviews;
    });
  }

  /**
   * Get all reviews for a pull request
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param pullNumber - PR number
   */
  async getPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GitHubReview[]> {
    return this.withRetry(async () => {
      const { data } = await this.client.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return data.map((review) => ({
        id: review.id,
        node_id: review.node_id,
        user: {
          login: review.user?.login || '',
          id: review.user?.id || 0,
          node_id: review.user?.node_id || '',
        },
        body: review.body || undefined,
        state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING',
        html_url: review.html_url,
        pull_request_url: review.pull_request_url,
        submitted_at: review.submitted_at || new Date().toISOString(),
      })) as GitHubReview[];
    });
  }

  /**
   * Get comprehensive user activity for a time period
   * @param username - GitHub username
   * @param since - Start date (default: 30 days ago)
   * @param until - End date (default: now)
   */
  async getUserActivity(
    username: string,
    since?: Date,
    until?: Date
  ): Promise<GitHubUserActivity> {
    const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const untilDate = until || new Date();

    return this.withRetry(async () => {
      // Get user info
      const userInfo = await this.getCurrentUser();

      // Fetch all data in parallel
      const [pullRequests, issues, reviews, repositories] = await Promise.all([
        this.getUserPullRequests(username, { since: sinceDate, state: 'all' }),
        this.getUserIssues(username, { since: sinceDate, state: 'all' }),
        this.getUserReviews(username, sinceDate),
        this.getUserRepositories(username, sinceDate),
      ]);

      // Categorize pull requests
      const mergedPRs = pullRequests.filter(
        (pr) => pr.merged_at && new Date(pr.merged_at) >= sinceDate && new Date(pr.merged_at) <= untilDate
      );
      const activePRs = pullRequests.filter((pr) => pr.state === 'open');
      const createdPRs = pullRequests.filter(
        (pr) => new Date(pr.created_at) >= sinceDate && new Date(pr.created_at) <= untilDate
      );

      // Categorize issues
      const closedIssues = issues.filter(
        (issue) =>
          issue.closed_at && new Date(issue.closed_at) >= sinceDate && new Date(issue.closed_at) <= untilDate
      );
      const activeIssues = issues.filter((issue) => issue.state === 'open');
      const createdIssues = issues.filter(
        (issue) => new Date(issue.created_at) >= sinceDate && new Date(issue.created_at) <= untilDate
      );

      return {
        username,
        userId: userInfo.id,
        since: sinceDate,
        until: untilDate,
        pullRequests: {
          created: createdPRs,
          merged: mergedPRs,
          active: activePRs,
        },
        issues: {
          created: createdIssues,
          closed: closedIssues,
          active: activeIssues,
        },
        reviews,
        repositories,
      };
    });
  }

  /**
   * Retry wrapper with exponential backoff
   * Handles rate limiting and transient errors
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryOptions.initialDelay;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error) || attempt === this.retryOptions.maxRetries) {
          throw this.enhanceError(error, attempt);
        }

        // Wait before retrying (exponential backoff)
        console.warn(
          `GitHub API call failed (attempt ${attempt + 1}/${this.retryOptions.maxRetries + 1}): ${
            lastError.message
          }. Retrying in ${delay}ms...`
        );

        await this.sleep(delay);
        delay = Math.min(delay * 2, this.retryOptions.maxDelay);
      }
    }

    throw new Error(`Failed after ${this.retryOptions.maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Check if an error should trigger a retry
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Retry on rate limiting
      if (message.includes('rate limit') || message.includes('403')) {
        return true;
      }

      // Retry on timeout
      if (message.includes('timeout') || message.includes('econnreset')) {
        return true;
      }

      // Retry on temporary server errors
      if (message.includes('502') || message.includes('503') || message.includes('504')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enhance error messages with additional context
   */
  private enhanceError(error: unknown, attempt: number): Error {
    if (error instanceof Error) {
      const enhancedMessage = `GitHub API error (attempt ${attempt + 1}): ${error.message}`;
      const enhancedError = new Error(enhancedMessage);
      enhancedError.stack = error.stack;
      return enhancedError;
    }

    return new Error(`Unknown GitHub API error: ${String(error)}`);
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
