/**
 * Represents a Slack user in the workspace.
 */
export interface SlackUser {
  id: string;
  email: string;
  realName: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    image?: string;
  };
}

/**
 * Represents a message to be sent to Slack.
 * Supports both plain text and Block Kit format.
 */
export interface SlackMessage {
  text: string;
  blocks?: unknown[]; // Block Kit blocks (Phase 2)
}

/**
 * Result of attempting to deliver a message via Slack.
 */
export interface SlackDeliveryResult {
  success: boolean;
  error?: string;
  channelId?: string;
  timestamp?: string;
}

/**
 * User report data structure for formatting.
 */
export interface UserReport {
  userName: string;
  issuesCompleted: Issue[];
  issuesInProgress: Issue[];
  issuesUpdated: Issue[];
  otherOpenIssues: Issue[];
  reportPeriodStart: Date;
  reportPeriodEnd: Date;
  linearTeamKey?: string; // Deprecated: Use linearOrgUrlKey instead
  linearOrgUrlKey?: string; // Organization URL key (workspace slug)
  linearUserId?: string;
}

/**
 * Represents a Linear issue for reporting.
 */
export interface Issue {
  identifier: string; // e.g., "ENG-123"
  title: string;
  projectName?: string;
  state: string;
  priority?: number;
  estimate?: number;
}

/**
 * Cooldown status for a user.
 */
export interface CooldownStatus {
  isInCooldown: boolean;
  weekNumber?: number;
  totalWeeks?: number;
  endDate?: Date;
}
