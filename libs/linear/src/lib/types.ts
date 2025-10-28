/**
 * Linear API TypeScript type definitions
 */

/**
 * Represents a Linear organization
 */
export interface LinearOrganization {
  id: string;
  name: string;
  urlKey: string;
}

/**
 * Represents a Linear user
 */
export interface LinearUser {
  id: string;
  name: string;
  email: string;
  active?: boolean;
  organization?: LinearOrganization;
}

/**
 * Represents a Linear workflow state
 */
export interface LinearWorkflowState {
  id: string;
  name: string;
  type: 'backlog' | 'started' | 'completed' | 'canceled';
}

/**
 * Represents a Linear team
 */
export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

/**
 * Represents a Linear project
 */
export interface LinearProject {
  id: string;
  name: string;
}

/**
 * Represents a Linear issue
 */
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  estimate?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  startedAt?: string;
  canceledAt?: string;
  state: LinearWorkflowState;
  project?: LinearProject;
  team: LinearTeam;
}

/**
 * Summary of issues grouped by project
 */
export interface ProjectSummary {
  project?: LinearProject;
  issues: LinearIssue[];
}

/**
 * Represents a user's complete report data
 */
export interface UserReport {
  user: LinearUser;
  recentlyCompleted: LinearIssue[];
  recentlyStarted: LinearIssue[];
  recentlyUpdated: LinearIssue[];
  otherOpenIssues: LinearIssue[];
  projectSummary: ProjectSummary[];
}

/**
 * GraphQL API response for viewer query
 */
export interface ViewerResponse {
  viewer: LinearUser;
}

/**
 * GraphQL API response for assigned issues query
 */
export interface AssignedIssuesResponse {
  viewer: {
    assignedIssues: {
      nodes: LinearIssue[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor?: string;
      };
    };
  };
}

/**
 * GraphQL API response for issues query (by user ID filter)
 */
export interface IssuesForUserResponse {
  issues: {
    nodes: LinearIssue[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}

/**
 * GraphQL API response for all users query
 */
export interface UsersResponse {
  users: {
    nodes: LinearUser[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
  };
}
