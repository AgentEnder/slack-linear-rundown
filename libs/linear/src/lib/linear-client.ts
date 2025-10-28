/**
 * Linear GraphQL API client
 */

import { GraphQLClient } from 'graphql-request';
import {
  LinearUser,
  LinearIssue,
  ViewerResponse,
  AssignedIssuesResponse,
  IssuesForUserResponse,
  UsersResponse,
} from './types.js';
import {
  GET_CURRENT_USER,
  GET_ALL_ASSIGNED_ISSUES,
  GET_ISSUES_FOR_USER,
  GET_ALL_USERS
} from './queries.js';

/**
 * Configuration for LinearClient
 */
export interface LinearClientConfig {
  apiKey: string;
  endpoint?: string;
}

/**
 * Options for retry behavior
 */
interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

/**
 * Linear GraphQL API client
 * Handles authentication, queries, pagination, and error handling with retries
 */
export class LinearClient {
  private client: GraphQLClient;
  private retryOptions: RetryOptions;

  /**
   * Creates a new Linear client instance
   * @param config - Configuration including API key and optional endpoint
   */
  constructor(config: LinearClientConfig) {
    const endpoint = config.endpoint || 'https://api.linear.app/graphql';

    this.client = new GraphQLClient(endpoint, {
      headers: {
        Authorization: config.apiKey,
      },
    });

    this.retryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    };
  }

  /**
   * Get the current authenticated user
   * @returns Promise resolving to LinearUser
   */
  async getCurrentUser(): Promise<LinearUser> {
    return this.withRetry(async () => {
      const response = await this.client.request<ViewerResponse>(
        GET_CURRENT_USER
      );
      return response.viewer;
    });
  }

  /**
   * Get all assigned issues for the current user
   * Fetches ALL open issues + recently closed issues (updated in past month)
   * Filters on client side to include:
   * - All issues that are NOT completed/canceled
   * - OR issues that were updated after oneMonthAgo
   *
   * @param oneMonthAgo - Date representing one month ago (for filtering recently closed issues)
   * @returns Promise resolving to array of LinearIssue
   */
  async getAllAssignedIssues(oneMonthAgo: Date): Promise<LinearIssue[]> {
    return this.withRetry(async () => {
      const allIssues: LinearIssue[] = [];
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        const response: AssignedIssuesResponse =
          await this.client.request<AssignedIssuesResponse>(
            GET_ALL_ASSIGNED_ISSUES,
            {
              after: cursor,
            }
          );

        const nodes = response.viewer.assignedIssues.nodes;
        const pageInfo = response.viewer.assignedIssues.pageInfo;

        allIssues.push(...nodes);

        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;
      }

      // Filter on client side:
      // Include issues that are NOT completed/canceled OR were updated after oneMonthAgo
      const oneMonthAgoTime = oneMonthAgo.getTime();
      const filteredIssues = allIssues.filter((issue) => {
        const isOpen = issue.state.type !== 'completed' && issue.state.type !== 'canceled';
        const recentlyUpdated = new Date(issue.updatedAt).getTime() >= oneMonthAgoTime;
        return isOpen || recentlyUpdated;
      });

      return filteredIssues;
    });
  }

  /**
   * Get issues assigned to a specific user
   * Fetches ALL open issues + recently closed issues (updated in past month)
   * for a specific user by their Linear user ID
   *
   * @param userId - Linear user ID to fetch issues for
   * @param oneMonthAgo - Date representing one month ago (for filtering recently closed issues)
   * @returns Promise resolving to array of LinearIssue
   */
  async getIssuesForUser(userId: string, oneMonthAgo: Date): Promise<LinearIssue[]> {
    return this.withRetry(async () => {
      const allIssues: LinearIssue[] = [];
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        const response: IssuesForUserResponse =
          await this.client.request<IssuesForUserResponse>(
            GET_ISSUES_FOR_USER,
            {
              userId,
              after: cursor,
            }
          );

        const nodes = response.issues.nodes;
        const pageInfo = response.issues.pageInfo;

        allIssues.push(...nodes);

        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;
      }

      // Filter on client side:
      // Include issues that are NOT completed/canceled OR were updated after oneMonthAgo
      const oneMonthAgoTime = oneMonthAgo.getTime();
      const filteredIssues = allIssues.filter((issue) => {
        const isOpen = issue.state.type !== 'completed' && issue.state.type !== 'canceled';
        const recentlyUpdated = new Date(issue.updatedAt).getTime() >= oneMonthAgoTime;
        return isOpen || recentlyUpdated;
      });

      return filteredIssues;
    });
  }

  /**
   * Get all users in the Linear workspace
   * Fetches ALL active users with pagination
   *
   * @returns Promise resolving to array of LinearUser
   */
  async getAllUsers(): Promise<LinearUser[]> {
    return this.withRetry(async () => {
      const allUsers: LinearUser[] = [];
      let hasNextPage = true;
      let cursor: string | undefined = undefined;

      while (hasNextPage) {
        const response: UsersResponse =
          await this.client.request<UsersResponse>(GET_ALL_USERS, {
            after: cursor,
          });

        const nodes = response.users.nodes;
        const pageInfo = response.users.pageInfo;

        // Filter to only active users
        allUsers.push(...nodes.filter((u) => u.active !== false));

        hasNextPage = pageInfo.hasNextPage;
        cursor = pageInfo.endCursor;
      }

      return allUsers;
    });
  }

  /**
   * Execute a function with exponential backoff retry logic
   * @param fn - Async function to execute
   * @returns Promise resolving to the function's result
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryOptions.initialDelay;

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Enhanced error logging for debugging
        const errorDetails = this.extractErrorDetails(error);
        console.error(`Linear API Error (attempt ${attempt + 1}/${this.retryOptions.maxRetries + 1}):`, {
          message: lastError.message,
          ...errorDetails
        });

        // Don't retry on last attempt
        if (attempt === this.retryOptions.maxRetries) {
          break;
        }

        // Check if error is retryable (rate limit or network error)
        if (!this.isRetryableError(error)) {
          throw error;
        }

        console.log(`Retrying in ${delay}ms...`);

        // Wait before retrying with exponential backoff
        await this.sleep(delay);

        // Increase delay exponentially, but cap at maxDelay
        delay = Math.min(delay * 2, this.retryOptions.maxDelay);
      }
    }

    throw new Error(
      `Failed after ${this.retryOptions.maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * Extract detailed error information for debugging
   * @param error - Error object
   * @returns Object with error details
   */
  private extractErrorDetails(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const details: Record<string, unknown> = {
        name: error.name,
        stack: error.stack,
      };

      // Extract GraphQL-specific error details
      const errorAny = error as any;
      if (errorAny.response) {
        details.response = errorAny.response;
      }
      if (errorAny.request) {
        details.request = {
          query: errorAny.request.query,
          variables: errorAny.request.variables,
        };
      }

      return details;
    }
    return { raw: error };
  }

  /**
   * Determine if an error should trigger a retry
   * @param error - Error object from failed request
   * @returns true if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Retry on rate limits, timeouts, and network errors
      return (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('econnreset') ||
        message.includes('enotfound')
      );
    }
    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
