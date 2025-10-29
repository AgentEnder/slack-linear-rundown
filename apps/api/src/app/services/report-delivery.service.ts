/**
 * Report Delivery Service
 *
 * Handles delivery of reports to users via Slack.
 * Manages retries, error handling, and delivery logging.
 */

import {
  ReportDeliveryLog,
  ReportStatus,
  User,
} from '@slack-linear-rundown/database';
import { SlackClient } from '@slack-linear-rundown/slack';
import * as ReportGenerationService from './report-generation.service.js';
import * as ReportCacheService from './report-cache.service.js';
import { LinearClient } from '@slack-linear-rundown/linear';
import { logger } from '../utils/logger.js';
import * as UserMappingService from './user-mapping.service.js';

/**
 * Result of a delivery attempt.
 */
export interface DeliveryResult {
  userId: number;
  success: boolean;
  error?: string;
  issuesCount?: number;
  inCooldown?: boolean;
}

/**
 * Deliver a report to a single user.
 * Generates the report and sends it via Slack DM.
 *
 * @param user - Database user record
 * @param slackClient - Initialized Slack client
 * @param linearClient - Initialized Linear client
 * @param options - Optional configuration (encryptionKey, sharedGitHubToken)
 * @returns Promise<DeliveryResult>
 */
export async function deliverReport(
  user: User,
  slackClient: SlackClient,
  linearClient: LinearClient,
  options?: {
    encryptionKey?: string;
    sharedGitHubToken?: string;
  }
): Promise<DeliveryResult> {
  logger.info(`Delivering report to user ${user.id} (${user.email})`);

  if (!user.slack_user_id) {
    const error = `User ${user.email} does not have a Slack user ID mapped`;
    logger.warn(error);

    await logDelivery({
      user_id: user.id,
      sent_at: new Date(),
      status: ReportStatus.SKIPPED,
      error_message: error,
      report_period_start: new Date().toISOString().split('T')[0],
      report_period_end: new Date().toISOString().split('T')[0],
    });

    return {
      userId: user.id,
      success: false,
      error,
    };
  }

  try {
    // Check cache first
    let reportResult = ReportCacheService.getCachedReport(user.id);

    if (!reportResult) {
      // Cache miss - generate new report
      reportResult = await ReportGenerationService.generateReportForUser(
        user,
        linearClient,
        options
      );
      // Note: We don't cache here since we're about to send it.
      // The preview endpoint caches, and after sending we want fresh data next time.
    }

    // Send via Slack
    const deliveryResult = await slackClient.sendDM(user.slack_user_id, {
      text: reportResult.reportText,
    });

    // Invalidate cache after sending (user will need fresh data on next report)
    ReportCacheService.invalidateCachedReport(user.id);

    // Log the delivery attempt
    await logDelivery({
      user_id: user.id,
      sent_at: new Date(),
      status: deliveryResult.success ? ReportStatus.SUCCESS : ReportStatus.FAILED,
      error_message: deliveryResult.error ?? null,
      message_content: reportResult.reportText,
      report_period_start: reportResult.periodStart.toISOString().split('T')[0],
      report_period_end: reportResult.periodEnd.toISOString().split('T')[0],
      issues_count: reportResult.issuesCount,
      in_cooldown: reportResult.inCooldown,
    });

    if (deliveryResult.success) {
      logger.info(`Successfully delivered report to user ${user.id}`);
      return {
        userId: user.id,
        success: true,
        issuesCount: reportResult.issuesCount,
        inCooldown: reportResult.inCooldown,
      };
    } else {
      logger.warn(`Failed to deliver report to user ${user.id}`, {
        error: deliveryResult.error,
      });
      return {
        userId: user.id,
        success: false,
        error: deliveryResult.error,
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Error delivering report to user ${user.id}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await logDelivery({
      user_id: user.id,
      sent_at: new Date(),
      status: ReportStatus.FAILED,
      error_message: errorMessage,
      report_period_start: new Date().toISOString().split('T')[0],
      report_period_end: new Date().toISOString().split('T')[0],
    });

    return {
      userId: user.id,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deliver reports to all active users who should receive reports.
 * Generates and delivers reports sequentially with rate limiting.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Initialized Linear client
 * @returns Promise<DeliveryResult[]> - Array of delivery results
 */
export async function deliverReportToAll(
  slackClient: SlackClient,
  linearClient: LinearClient
): Promise<DeliveryResult[]> {
  logger.info('Starting delivery to all users who should receive reports...');

  const users = await UserMappingService.getReportRecipients();
  logger.info(`Found ${users.length} users who should receive reports`);

  const results: DeliveryResult[] = [];

  for (const user of users) {
    const result = await deliverReport(user, slackClient, linearClient);
    results.push(result);
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  logger.info(`Delivery complete: ${successCount} succeeded, ${failureCount} failed`);

  return results;
}

/**
 * Retry a failed delivery with exponential backoff.
 *
 * @param logId - ID of the report delivery log to retry
 * @param slackClient - Initialized Slack client
 * @param linearClient - Initialized Linear client
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns Promise<DeliveryResult>
 */
export async function retryFailedDelivery(
  logId: number,
  slackClient: SlackClient,
  linearClient: LinearClient,
  maxRetries: number = 3
): Promise<DeliveryResult> {
  logger.info(`Retrying failed delivery for log ID ${logId}`);

  const deliveryLog = await getDeliveryLogById(logId);

  if (!deliveryLog) {
    const error = `Delivery log ${logId} not found`;
    logger.error(error);
    throw new Error(error);
  }

  if (deliveryLog.status !== ReportStatus.FAILED) {
    const error = `Delivery log ${logId} is not in failed state`;
    logger.error(error);
    throw new Error(error);
  }

  const user = await User.findByPk(deliveryLog.user_id);

  if (!user) {
    const error = `User ${deliveryLog.user_id} not found`;
    logger.error(error);
    throw new Error(error);
  }

  let lastError: string | undefined;
  let delay = 1000; // Start with 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.info(`Retry attempt ${attempt}/${maxRetries} for user ${user.id}`);

    const result = await deliverReport(user, slackClient, linearClient);

    if (result.success) {
      logger.info(`Retry succeeded on attempt ${attempt} for user ${user.id}`);
      return result;
    }

    lastError = result.error;

    // Don't sleep after last attempt
    if (attempt < maxRetries) {
      logger.info(`Retry failed, waiting ${delay}ms before next attempt`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }

  logger.error(`All retry attempts exhausted for user ${user.id}`);

  return {
    userId: user.id,
    success: false,
    error: `Failed after ${maxRetries} retries: ${lastError}`,
  };
}

/**
 * Log a delivery attempt to the database.
 */
async function logDelivery(
  log: Partial<ReportDeliveryLog> & {
    user_id: number;
    sent_at: Date;
    status: ReportStatus;
    report_period_start: string;
    report_period_end: string;
  }
): Promise<void> {
  try {
    await ReportDeliveryLog.create(log);
  } catch (error) {
    logger.error('Failed to log delivery', {
      error: error instanceof Error ? error.message : 'Unknown error',
      log,
    });
  }
}

/**
 * Get a delivery log by ID.
 * Helper function to retrieve a specific log entry.
 */
async function getDeliveryLogById(logId: number): Promise<ReportDeliveryLog | null> {
  try {
    return await ReportDeliveryLog.findByPk(logId);
  } catch (error) {
    logger.error(`Failed to get delivery log ${logId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Sleep utility for exponential backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
