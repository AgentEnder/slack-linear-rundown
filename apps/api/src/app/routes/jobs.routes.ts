/**
 * Jobs routes for managing scheduled tasks.
 *
 * Provides endpoints to view job status and trigger jobs manually.
 */

import { Router, Request, Response } from 'express';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import { runWeeklyReport, runUserSync } from '../jobs/index.js';
import { logger } from '../utils/logger.js';
import { environment } from '../../environment/environment.js';
import { getConfigValue } from '../utils/config.js';

export const jobsRouter = Router();

// In-memory storage for job run history
interface JobRunHistory {
  lastRun: Date | null;
  lastStatus: 'success' | 'failure' | 'running' | null;
  lastError: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
}

const jobHistory: Record<string, JobRunHistory> = {
  'weekly-report': {
    lastRun: null,
    lastStatus: null,
    lastError: null,
    lastDurationMs: null,
    isRunning: false,
  },
  'user-sync': {
    lastRun: null,
    lastStatus: null,
    lastError: null,
    lastDurationMs: null,
    isRunning: false,
  },
};

/**
 * GET /api/jobs
 * Get status of all scheduled jobs
 */
jobsRouter.get('/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = [
      {
        id: 'weekly-report',
        name: 'Weekly Report Delivery',
        description: 'Delivers weekly status reports to all active users',
        schedule: environment.REPORT_SCHEDULE || '0 9 * * 1',
        scheduleDescription: 'Every Monday at 9:00 AM',
        ...jobHistory['weekly-report'],
      },
      {
        id: 'user-sync',
        name: 'User Synchronization',
        description: 'Syncs Slack workspace users with the database',
        schedule: '0 2 * * *',
        scheduleDescription: 'Daily at 2:00 AM',
        ...jobHistory['user-sync'],
      },
    ];

    res.status(200).json({
      success: true,
      jobs,
    });
  } catch (error) {
    logger.error('Error fetching job status', { error });
    res.status(500).json({
      error: 'Failed to fetch job status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/jobs/:jobId/run
 * Manually trigger a job to run
 */
jobsRouter.post(
  '/jobs/:jobId/run',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobId } = req.params;

      if (!['weekly-report', 'user-sync'].includes(jobId)) {
        res.status(404).json({
          error: 'Job not found',
          message: `Invalid job ID: ${jobId}`,
        });
        return;
      }

      // Check if job is already running
      if (jobHistory[jobId].isRunning) {
        res.status(409).json({
          error: 'Job already running',
          message: `Job ${jobId} is currently executing`,
        });
        return;
      }

      // Mark job as running
      jobHistory[jobId].isRunning = true;
      jobHistory[jobId].lastStatus = 'running';
      const startTime = new Date();

      // Send immediate response that job started
      res.status(202).json({
        success: true,
        message: `Job ${jobId} started`,
        jobId,
      });

      // Run job asynchronously
      (async () => {
        try {
          logger.info(`Manually triggering job: ${jobId}`);

          if (jobId === 'weekly-report') {
            // Get encryption key and API credentials
            const encryptionKey = environment.ENCRYPTION_KEY;
            if (!encryptionKey) {
              throw new Error('Encryption key not configured');
            }

            const slackToken = await getConfigValue(
              'SLACK_BOT_TOKEN',
              encryptionKey
            );
            const linearApiKey = await getConfigValue(
              'LINEAR_API_KEY',
              encryptionKey
            );

            if (!slackToken || !linearApiKey) {
              throw new Error('Slack or Linear credentials not configured');
            }

            const slackClient = new SlackClient({ botToken: slackToken });
            const linearClient = new LinearClient({ apiKey: linearApiKey });

            const summary = await runWeeklyReport(slackClient, linearClient);

            const endTime = new Date();
            jobHistory[jobId] = {
              lastRun: startTime,
              lastStatus: 'success',
              lastError: null,
              lastDurationMs: endTime.getTime() - startTime.getTime(),
              isRunning: false,
            };

            logger.info(`Job ${jobId} completed successfully`, {
              summary,
              durationMs: jobHistory[jobId].lastDurationMs,
            });
          } else if (jobId === 'user-sync') {
            const encryptionKey = environment.ENCRYPTION_KEY;
            if (!encryptionKey) {
              throw new Error('Encryption key not configured');
            }

            const slackToken = await getConfigValue(
              'SLACK_BOT_TOKEN',
              encryptionKey
            );
            const linearApiKey = await getConfigValue(
              'LINEAR_API_KEY',
              encryptionKey
            );

            if (!slackToken) {
              throw new Error('Slack credentials not configured');
            }

            const slackClient = new SlackClient({ botToken: slackToken });

            // Linear client is optional for user sync
            let linearClient: LinearClient | undefined;
            if (linearApiKey) {
              linearClient = new LinearClient({ apiKey: linearApiKey });
            }

            const summary = await runUserSync(slackClient, linearClient);

            jobHistory[jobId] = {
              lastRun: startTime,
              lastStatus: summary.success ? 'success' : 'failure',
              lastError: summary.error || null,
              lastDurationMs: summary.durationMs,
              isRunning: false,
            };

            logger.info(`Job ${jobId} completed`, {
              success: summary.success,
              durationMs: jobHistory[jobId].lastDurationMs,
            });
          }
        } catch (error) {
          const endTime = new Date();
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';

          jobHistory[jobId] = {
            lastRun: startTime,
            lastStatus: 'failure',
            lastError: errorMessage,
            lastDurationMs: endTime.getTime() - startTime.getTime(),
            isRunning: false,
          };

          logger.error(`Job ${jobId} failed`, {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            durationMs: jobHistory[jobId].lastDurationMs,
          });
        }
      })();
    } catch (error) {
      logger.error('Error triggering job', { error });

      // Make sure to clear running state
      if (req.params.jobId && jobHistory[req.params.jobId]) {
        jobHistory[req.params.jobId].isRunning = false;
      }

      res.status(500).json({
        error: 'Failed to trigger job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
