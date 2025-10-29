/**
 * Weekly Report Scheduled Job
 *
 * Automatically generates and delivers weekly status reports to all active users.
 * Runs on a configurable schedule (default: Monday at 9:00 AM).
 */

import * as cron from 'node-cron';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import * as ReportDeliveryService from '../services/report-delivery.service.js';
import * as UserMappingService from '../services/user-mapping.service.js';
import { logger } from '../utils/logger.js';

/**
 * Summary of report delivery run.
 */
interface DeliverySummary {
  totalUsers: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Initialize and start the weekly report job.
 * The job will run on the configured schedule and deliver reports to all active users.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Initialized Linear client
 * @param schedule - Cron expression for schedule (default: '0 9 * * 1' - Monday 9AM)
 * @param options - Optional configuration (encryptionKey, sharedGitHubToken)
 * @returns cron.ScheduledTask - The scheduled task (can be stopped with task.stop())
 */
export function initWeeklyReportJob(
  slackClient: SlackClient,
  linearClient: LinearClient,
  schedule: string = '0 9 * * 1',
  options?: {
    encryptionKey?: string;
    sharedGitHubToken?: string;
  }
): cron.ScheduledTask {
  logger.info('Initializing weekly report job', { schedule });

  // Validate cron expression
  if (!cron.validate(schedule)) {
    const error = `Invalid cron expression: ${schedule}`;
    logger.error(error);
    throw new Error(error);
  }

  const task = cron.schedule(
    schedule,
    async () => {
      await runWeeklyReport(slackClient, linearClient, options);
    }
  );

  logger.info('Weekly report job initialized successfully', {
    schedule,
    nextRun: 'Scheduled',
  });

  return task;
}

/**
 * Execute the weekly report generation and delivery.
 * This function can also be called manually for testing.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Initialized Linear client
 * @param options - Optional configuration (encryptionKey, sharedGitHubToken)
 */
export async function runWeeklyReport(
  slackClient: SlackClient,
  linearClient: LinearClient,
  options?: {
    encryptionKey?: string;
    sharedGitHubToken?: string;
  }
): Promise<DeliverySummary> {
  const startTime = new Date();
  logger.info('Starting weekly report job', { startTime: startTime.toISOString() });

  try {
    // Get all users who should receive reports
    const users = await UserMappingService.getReportRecipients();
    logger.info(`Found ${users.length} users who should receive reports`);

    if (users.length === 0) {
      logger.warn('No active users found, skipping report generation');
      return createSummary(startTime, new Date(), 0, 0, 0, 0);
    }

    const results: ReportDeliveryService.DeliveryResult[] = [];

    // Deliver reports to each user sequentially
    for (const user of users) {
      try {
        logger.info(`Processing report for user ${user.id} (${user.email})`);

        const result = await ReportDeliveryService.deliverReport(
          user,
          slackClient,
          linearClient,
          options
        );

        results.push(result);

        // Log individual result
        if (result.success) {
          logger.info(`Successfully delivered report to user ${user.id}`, {
            userId: user.id,
            email: user.email,
            issuesCount: result.issuesCount,
            inCooldown: result.inCooldown,
          });
        } else {
          logger.warn(`Failed to deliver report to user ${user.id}`, {
            userId: user.id,
            email: user.email,
            error: result.error,
          });
        }
      } catch (error) {
        // Continue processing other users even if one fails
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error processing report for user ${user.id}`, {
          userId: user.id,
          email: user.email,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Add failed result
        results.push({
          userId: user.id!,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Calculate summary
    const endTime = new Date();
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success && r.error).length;
    const skippedCount = results.length - successCount - failureCount;

    const summary = createSummary(
      startTime,
      endTime,
      users.length,
      successCount,
      failureCount,
      skippedCount
    );

    // Log summary
    logger.info('Weekly report job completed', {
      totalUsers: summary.totalUsers,
      successCount: summary.successCount,
      failureCount: summary.failureCount,
      skippedCount: summary.skippedCount,
      durationMs: summary.durationMs,
      startTime: summary.startTime.toISOString(),
      endTime: summary.endTime.toISOString(),
    });

    return summary;
  } catch (error) {
    const endTime = new Date();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Weekly report job failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
    });

    throw error;
  }
}

/**
 * Create a delivery summary object.
 */
function createSummary(
  startTime: Date,
  endTime: Date,
  totalUsers: number,
  successCount: number,
  failureCount: number,
  skippedCount: number
): DeliverySummary {
  return {
    totalUsers,
    successCount,
    failureCount,
    skippedCount,
    startTime,
    endTime,
    durationMs: endTime.getTime() - startTime.getTime(),
  };
}
