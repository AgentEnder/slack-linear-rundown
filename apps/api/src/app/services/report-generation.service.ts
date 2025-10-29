/**
 * Report Generation Service
 *
 * Generates personalized weekly status reports for users.
 * Fetches Linear data, categorizes issues, applies cooldown filtering,
 * and formats the report for delivery.
 */

import { LinearClient, type LinearIssue } from '@slack-linear-rundown/linear';
import { GitHubClient } from '@slack-linear-rundown/github';
import type { User } from '@slack-linear-rundown/database';
import type { UserReport, Issue, CooldownStatus } from '@slack-linear-rundown/slack';
import { formatWeeklyReport } from '@slack-linear-rundown/slack';
import * as CooldownService from './cooldown.service.js';
import * as IssueSyncService from './issue-sync.service.js';
import * as GitHubSyncService from './github-sync.service.js';
import * as CorrelationService from './linear-github-correlation.service.js';
import * as SyncStatusService from './sync-status.service.js';
import * as GitHubTokenService from './github-token.service.js';
import { logger } from '../utils/logger.js';

/**
 * Result of report generation with metadata.
 */
export interface ReportResult {
  reportText: string;
  issuesCount: number;
  inCooldown: boolean;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Generate a complete report for a user.
 * Main entry point that orchestrates the entire report generation process.
 *
 * @param user - Database user record
 * @param linearClient - Initialized Linear client
 * @param options - Optional configuration (encryptionKey, sharedGitHubToken)
 * @returns Promise<ReportResult> - Formatted report and metadata
 */
export async function generateReportForUser(
  user: User,
  linearClient: LinearClient,
  options?: {
    encryptionKey?: string;
    sharedGitHubToken?: string;
  }
): Promise<ReportResult> {
  logger.info(`Generating report for user ${user.id} (${user.email})`);

  try {
    if (!user.linear_user_id) {
      throw new Error(`User ${user.email} does not have a Linear user ID mapped`);
    }

    // Get GitHub token for user (user-specific or fallback to shared)
    let githubClient: GitHubClient | undefined;
    const githubToken = await GitHubTokenService.getGitHubTokenWithFallback(
      user,
      options?.encryptionKey,
      options?.sharedGitHubToken
    );

    if (githubToken) {
      githubClient = new GitHubClient({ token: githubToken });
      logger.info(`GitHub client initialized for user ${user.id}`);
    }

    // Calculate date range (last 7 days for categorization, last month for API query)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setDate(now.getDate() - 30);

    // Get organization info for URL construction
    const currentUser = await linearClient.getCurrentUser();
    const orgUrlKey = currentUser.organization?.urlKey;

    // Fetch Linear data for this specific user
    const issues = await fetchLinearDataForUser(
      linearClient,
      user.linear_user_id,
      oneMonthAgo
    );

    // Check cooldown status
    const cooldownStatus = await CooldownService.getCooldownSchedule(user.id!);

    // Apply cooldown filtering if user is in cooldown
    let filteredIssues = issues;
    if (cooldownStatus.isInCooldown) {
      filteredIssues = CooldownService.filterIssuesForCooldown(issues);
      logger.info(
        `Applied cooldown filtering for user ${user.id}: ${issues.length} -> ${filteredIssues.length} issues`
      );
    }

    // Categorize issues by recent activity
    const categorizedIssues = categorizeIssues(filteredIssues, sevenDaysAgo);

    // Sync Linear issues to database for user app
    try {
      await SyncStatusService.withSyncTracking(
        'linear_issues',
        async () => {
          await IssueSyncService.syncIssuesToDatabase(categorizedIssues, {
            userId: user.id!,
            reportPeriodStart: sevenDaysAgo.toISOString().split('T')[0],
            reportPeriodEnd: now.toISOString().split('T')[0],
            snapshotDate: now,
          });
          logger.info(`Synced Linear issues to database for user ${user.id}`);
          return { issuesCount: issues.length };
        },
        (result) => ({ itemsProcessed: result.issuesCount })
      );
    } catch (syncError) {
      // Log the error but don't fail the report generation
      logger.error(`Failed to sync Linear issues to database for user ${user.id}`, {
        error: syncError instanceof Error ? syncError.message : 'Unknown error',
      });
    }

    // Sync GitHub data to database (if GitHub client is available)
    if (githubClient && user.github_username) {
      try {
        await SyncStatusService.withSyncTracking(
          'github_data',
          async () => {
            logger.info(`Fetching GitHub data for user ${user.github_username}`);

            // Fetch GitHub activity
            const githubActivity = await githubClient.getUserActivity(
              user.github_username,
              sevenDaysAgo,
              now
            );

            // Categorize GitHub data
            const categorizedGitHub: GitHubSyncService.CategorizedGitHubData = {
              completedPRs: githubActivity.pullRequests.merged,
              activePRs: githubActivity.pullRequests.active,
              completedIssues: githubActivity.issues.closed,
              activeIssues: githubActivity.issues.active,
              reviews: githubActivity.reviews,
              repositories: githubActivity.repositories,
            };

            logger.info(`GitHub activity for user ${user.github_username}`, {
              completedPRs: categorizedGitHub.completedPRs.length,
              activePRs: categorizedGitHub.activePRs.length,
              completedIssues: categorizedGitHub.completedIssues.length,
              activeIssues: categorizedGitHub.activeIssues.length,
              reviews: categorizedGitHub.reviews.length,
            });

            // Sync GitHub data to database
            await GitHubSyncService.syncGitHubDataToDatabase(categorizedGitHub, {
              userId: user.id!,
              reportPeriodStart: sevenDaysAgo.toISOString().split('T')[0],
              reportPeriodEnd: now.toISOString().split('T')[0],
              snapshotDate: now,
            });

            // Run correlation to link GitHub PRs/issues with Linear issues
            const prsWithIds = categorizedGitHub.completedPRs
              .concat(categorizedGitHub.activePRs)
              .map((pr) => ({
                githubPR: pr,
                dbId: 0, // Will be looked up by correlation service
              }));

            const issuesWithIds = categorizedGitHub.completedIssues
              .concat(categorizedGitHub.activeIssues)
              .map((issue) => ({
                githubIssue: issue,
                dbId: 0, // Will be looked up by correlation service
              }));

            // Note: Correlation will look up the database IDs internally
            const correlationResult = await CorrelationService.correlateBatch({
              prs: prsWithIds,
              issues: issuesWithIds,
            });

            logger.info(`Correlated GitHub work with Linear issues for user ${user.id}`, {
              totalMatches: correlationResult.totalMatches,
              createdLinks: correlationResult.createdLinks,
            });

            return {
              prsCount: categorizedGitHub.completedPRs.length + categorizedGitHub.activePRs.length,
              issuesCount:
                categorizedGitHub.completedIssues.length + categorizedGitHub.activeIssues.length,
              reviewsCount: categorizedGitHub.reviews.length,
              correlatedLinks: correlationResult.createdLinks,
            };
          },
          (result) => ({
            itemsProcessed:
              result.prsCount + result.issuesCount + result.reviewsCount,
            correlatedLinks: result.correlatedLinks,
          })
        );
      } catch (githubError) {
        // Log the error but don't fail the report generation
        logger.error(`Failed to sync GitHub data for user ${user.id}`, {
          error: githubError instanceof Error ? githubError.message : 'Unknown error',
          githubUsername: user.github_username,
        });
      }
    } else {
      if (!githubClient) {
        logger.info(`GitHub client not available, skipping GitHub sync for user ${user.id}`);
      } else if (!user.github_username) {
        logger.info(`User ${user.id} does not have a GitHub username mapped, skipping GitHub sync`);
      }
    }

    // Format the report
    const reportText = formatReport(
      user,
      categorizedIssues,
      cooldownStatus,
      sevenDaysAgo,
      now,
      orgUrlKey
    );

    const totalIssues =
      categorizedIssues.recentlyCompleted.length +
      categorizedIssues.recentlyStarted.length +
      categorizedIssues.recentlyUpdated.length +
      categorizedIssues.otherOpenIssues.length;

    logger.info(`Generated report for user ${user.id}: ${totalIssues} issues`);

    return {
      reportText,
      issuesCount: totalIssues,
      inCooldown: cooldownStatus.isInCooldown,
      periodStart: sevenDaysAgo,
      periodEnd: now,
    };
  } catch (error) {
    logger.error(`Failed to generate report for user ${user.id}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userId: user.id,
      email: user.email,
    });
    throw error;
  }
}

/**
 * Fetch Linear data for a specific user.
 * Retrieves ALL open issues + recently closed issues (updated in past month)
 * that are assigned to the specified user.
 *
 * @param linearClient - Initialized Linear client
 * @param linearUserId - Linear user ID to fetch issues for
 * @param oneMonthAgo - Date representing one month ago
 * @returns Promise<LinearIssue[]> - Array of issues
 */
export async function fetchLinearDataForUser(
  linearClient: LinearClient,
  linearUserId: string,
  oneMonthAgo: Date
): Promise<LinearIssue[]> {
  try {
    const issues = await linearClient.getIssuesForUser(linearUserId, oneMonthAgo);
    logger.info(`Fetched ${issues.length} issues from Linear for user ${linearUserId}`);
    return issues;
  } catch (error) {
    logger.error('Failed to fetch Linear data for user', {
      linearUserId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Fetch Linear data for a user.
 * Retrieves ALL open issues + recently closed issues (updated in past month).
 *
 * @deprecated Use fetchLinearDataForUser instead for user-specific issues
 * @param linearClient - Initialized Linear client
 * @param oneMonthAgo - Date representing one month ago
 * @returns Promise<LinearIssue[]> - Array of issues
 */
export async function fetchLinearData(
  linearClient: LinearClient,
  oneMonthAgo: Date
): Promise<LinearIssue[]> {
  try {
    const issues = await linearClient.getAllAssignedIssues(oneMonthAgo);
    logger.info(`Fetched ${issues.length} issues from Linear`);
    return issues;
  } catch (error) {
    logger.error('Failed to fetch Linear data', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Categorized issues by activity type.
 */
interface CategorizedIssues {
  recentlyCompleted: LinearIssue[];
  recentlyStarted: LinearIssue[];
  recentlyUpdated: LinearIssue[];
  otherOpenIssues: LinearIssue[];
}

/**
 * Categorize issues into 4 buckets based on recent activity.
 *
 * CRITICAL LOGIC:
 * 1. recentlyCompleted: Closed in last 7 days
 * 2. recentlyStarted: Created in last 7 days (and still open)
 * 3. recentlyUpdated: Updated in last 7 days (but not in other categories)
 * 4. otherOpenIssues: All other open issues not in above categories
 *
 * @param issues - Array of Linear issues
 * @param periodStart - Start of the recent period (7 days ago)
 * @returns Categorized issues
 */
export function categorizeIssues(
  issues: LinearIssue[],
  periodStart: Date
): CategorizedIssues {
  const recentlyCompleted: LinearIssue[] = [];
  const recentlyStarted: LinearIssue[] = [];
  const recentlyUpdated: LinearIssue[] = [];
  const otherOpenIssues: LinearIssue[] = [];

  const periodStartTime = periodStart.getTime();

  for (const issue of issues) {
    const completedAt = issue.completedAt ? new Date(issue.completedAt).getTime() : null;
    const createdAt = new Date(issue.createdAt).getTime();
    const updatedAt = new Date(issue.updatedAt).getTime();
    const isOpen = issue.state.type !== 'completed' && issue.state.type !== 'canceled';

    // 1. Recently completed (closed in last 7 days)
    if (completedAt && completedAt >= periodStartTime) {
      recentlyCompleted.push(issue);
      continue;
    }

    // 2. Recently started (created in last 7 days and still open)
    if (isOpen && createdAt >= periodStartTime) {
      recentlyStarted.push(issue);
      continue;
    }

    // 3. Recently updated (updated in last 7 days but not completed or started)
    if (isOpen && updatedAt >= periodStartTime) {
      recentlyUpdated.push(issue);
      continue;
    }

    // 4. Other open issues (not recently touched but still assigned)
    if (isOpen) {
      otherOpenIssues.push(issue);
    }
  }

  logger.info('Categorized issues', {
    recentlyCompleted: recentlyCompleted.length,
    recentlyStarted: recentlyStarted.length,
    recentlyUpdated: recentlyUpdated.length,
    otherOpenIssues: otherOpenIssues.length,
  });

  return {
    recentlyCompleted,
    recentlyStarted,
    recentlyUpdated,
    otherOpenIssues,
  };
}

/**
 * Format the report using the Slack formatter.
 *
 * @param user - Database user record
 * @param categorizedIssues - Issues categorized by activity
 * @param cooldownStatus - User's cooldown status
 * @param periodStart - Start of report period
 * @param periodEnd - End of report period
 * @param orgUrlKey - Organization URL key from Linear
 * @returns Formatted report text
 */
function formatReport(
  user: User,
  categorizedIssues: CategorizedIssues,
  cooldownStatus: CooldownService.CooldownStatusResult,
  periodStart: Date,
  periodEnd: Date,
  orgUrlKey?: string
): string {
  // Convert LinearIssue to Slack Issue format
  const mapToSlackIssue = (issue: LinearIssue): Issue => ({
    identifier: issue.identifier,
    title: issue.title,
    projectName: issue.project?.name,
    state: issue.state.name,
    priority: issue.priority,
    estimate: issue.estimate,
  });

  // Build UserReport for formatter
  const report: UserReport = {
    userName: user.slack_real_name || user.linear_name || user.email,
    issuesCompleted: categorizedIssues.recentlyCompleted.map(mapToSlackIssue),
    issuesInProgress: categorizedIssues.recentlyStarted.map(mapToSlackIssue),
    issuesUpdated: categorizedIssues.recentlyUpdated.map(mapToSlackIssue),
    otherOpenIssues: categorizedIssues.otherOpenIssues.map(mapToSlackIssue),
    reportPeriodStart: periodStart,
    reportPeriodEnd: periodEnd,
    linearOrgUrlKey: orgUrlKey,
    linearUserId: user.linear_user_id ?? undefined,
  };

  // Build CooldownStatus for formatter
  const slackCooldownStatus: CooldownStatus = {
    isInCooldown: cooldownStatus.isInCooldown,
    weekNumber: cooldownStatus.weekNumber,
    totalWeeks: cooldownStatus.totalWeeks,
    endDate: cooldownStatus.endDate,
  };

  // Use Slack formatter to create message text
  return formatWeeklyReport(report, slackCooldownStatus);
}
