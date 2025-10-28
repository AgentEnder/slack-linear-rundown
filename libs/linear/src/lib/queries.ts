/**
 * GraphQL queries for Linear API
 */

/**
 * Query to get the current authenticated user and organization info
 */
export const GET_CURRENT_USER = `
  query Me {
    viewer {
      id
      name
      email
      organization {
        id
        name
        urlKey
      }
    }
  }
`;

/**
 * Query to get all assigned issues for the current user
 * Gets all assigned issues and filters on client side
 * This is more reliable than complex server-side filters
 *
 * Variables:
 * - after: String - Pagination cursor (optional)
 */
export const GET_ALL_ASSIGNED_ISSUES = `
  query AllAssignedIssues($after: String) {
    viewer {
      assignedIssues(
        sort: [{ updatedAt: { order: Descending } }]
        first: 100
        after: $after
      ) {
        nodes {
          id
          identifier
          title
          description
          priority
          estimate
          createdAt
          updatedAt
          completedAt
          startedAt
          canceledAt
          state {
            id
            name
            type
          }
          project {
            id
            name
          }
          team {
            id
            name
            key
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

/**
 * Query to get issues assigned to a specific user
 * Uses the issues query with a filter for a specific assignee
 *
 * Variables:
 * - userId: ID! - Linear user ID to fetch issues for (must be ID type, not String)
 * - after: String - Pagination cursor (optional)
 */
export const GET_ISSUES_FOR_USER = `
  query IssuesForUser($userId: ID!, $after: String) {
    issues(
      filter: {
        assignee: { id: { eq: $userId } }
      }
      orderBy: updatedAt
      first: 100
      after: $after
    ) {
      nodes {
        id
        identifier
        title
        description
        priority
        estimate
        createdAt
        updatedAt
        completedAt
        startedAt
        canceledAt
        state {
          id
          name
          type
        }
        project {
          id
          name
        }
        team {
          id
          name
          key
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Query to get all users in the workspace
 * Fetches active users with pagination
 *
 * Variables:
 * - after: String - Pagination cursor (optional)
 */
export const GET_ALL_USERS = `
  query AllUsers($after: String) {
    users(
      first: 100
      after: $after
    ) {
      nodes {
        id
        name
        email
        active
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
