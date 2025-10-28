/**
 * User Sync Scheduled Job
 *
 * Synchronizes Slack workspace users with the local database.
 * Runs daily to keep user mappings up to date.
 */

import * as cron from 'node-cron';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import * as UserMappingService from '../services/user-mapping.service.js';
import { logger } from '../utils/logger.js';

/**
 * Summary of user sync run.
 */
interface SyncSummary {
  success: boolean;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  error?: string;
}

/**
 * Initialize and start the user sync job.
 * The job will run on a daily schedule to sync Slack and Linear users with the database.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Optional initialized Linear client for user matching
 * @param schedule - Cron expression for schedule (default: '0 2 * * *' - Daily 2AM)
 * @returns cron.ScheduledTask - The scheduled task (can be stopped with task.stop())
 */
export function initUserSyncJob(
  slackClient: SlackClient,
  linearClient?: LinearClient,
  schedule: string = '0 2 * * *'
): cron.ScheduledTask {
  logger.info('Initializing user sync job', { schedule });

  // Validate cron expression
  if (!cron.validate(schedule)) {
    const error = `Invalid cron expression: ${schedule}`;
    logger.error(error);
    throw new Error(error);
  }

  const task = cron.schedule(
    schedule,
    async () => {
      await runUserSync(slackClient, linearClient);
    }
  );

  logger.info('User sync job initialized successfully', {
    schedule,
    nextRun: 'Scheduled',
  });

  return task;
}

/**
 * Execute the user synchronization.
 * This function can also be called manually for testing.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Optional initialized Linear client for user matching
 * @returns Promise<SyncSummary> - Summary of the sync operation
 */
export async function runUserSync(
  slackClient: SlackClient,
  linearClient?: LinearClient
): Promise<SyncSummary> {
  const startTime = new Date();
  logger.info('Starting user sync job', { startTime: startTime.toISOString() });

  try {
    // Call the user mapping service to sync users with Linear matching
    await UserMappingService.syncSlackUsers(slackClient, linearClient);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const summary: SyncSummary = {
      success: true,
      startTime,
      endTime,
      durationMs,
    };

    logger.info('User sync job completed successfully', {
      durationMs,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });

    return summary;
  } catch (error) {
    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('User sync job failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs,
    });

    const summary: SyncSummary = {
      success: false,
      startTime,
      endTime,
      durationMs,
      error: errorMessage,
    };

    return summary;
  }
}
