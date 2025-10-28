import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import { User, EncryptedConfigService } from '@slack-linear-rundown/database';
import * as ReportDeliveryService from '../services/report-delivery.service.js';
import * as ReportGenerationService from '../services/report-generation.service.js';
import * as ReportCacheService from '../services/report-cache.service.js';
import { logger } from '../utils/logger.js';
import { environment } from '../../environment/environment.js';

export const reportRouter = Router();

/**
 * Helper to get configuration value from database or environment
 * Tries database first, falls back to environment variables
 */
async function getConfigValue(key: string): Promise<string | null> {
  let value: string | null = null;

  // Only check database if encryption key is available
  if (environment.ENCRYPTION_KEY) {
    try {
      const dbKey = await EncryptedConfigService.getSource(key);

      if (dbKey) {
        try {
          value = await EncryptedConfigService.get(key, environment.ENCRYPTION_KEY);
          logger.info(`Retrieved ${key} from database`);
        } catch (error) {
          logger.error(`Failed to decrypt ${key} from database`, { error });
          // Continue to environment fallback
        }
      }
    } catch (error) {
      logger.error(`Error checking database for ${key}`, { error });
      // Continue to environment fallback
    }
  }

  // If not in database, check environment variables
  if (!value) {
    const envValue = environment[key as keyof typeof environment];
    if (envValue !== undefined && envValue !== null && envValue !== '') {
      value = String(envValue);
      logger.info(`Retrieved ${key} from environment variables`);
    }
  }

  return value;
}

/**
 * Zod schema for trigger report request
 */
const TriggerReportSchema = z.object({
  userId: z.number().int().positive().optional(),
});

/**
 * POST /api/trigger-report
 * Manually trigger report generation
 * Optional body: { userId?: number } - if not provided, send to all active users
 */
reportRouter.post('/trigger-report', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const parseResult = TriggerReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('Invalid trigger report request', {
        errors: parseResult.error.issues,
        body: req.body,
      });
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
      return;
    }

    const { userId } = parseResult.data;

    // Get credentials from database or environment
    const slackBotToken = await getConfigValue('SLACK_BOT_TOKEN');
    const linearApiKey = await getConfigValue('LINEAR_API_KEY');

    if (!slackBotToken || !linearApiKey) {
      logger.warn('Credentials not configured for report trigger');
      res.status(503).json({
        error: 'Service credentials not configured',
        message: 'Configure SLACK_BOT_TOKEN and LINEAR_API_KEY via the admin UI or environment variables',
      });
      return;
    }

    // Initialize clients
    const slackClient = new SlackClient({ botToken: slackBotToken });
    const linearClient = new LinearClient({ apiKey: linearApiKey });

    logger.info('Manual report trigger started', { userId });

    let results: ReportDeliveryService.DeliveryResult[];

    if (userId) {
      // Send to specific user
      const user = await User.findByPk(userId);
      if (!user) {
        logger.warn(`User not found for report trigger: ${userId}`);
        res.status(404).json({
          error: 'User not found',
        });
        return;
      }

      const result = await ReportDeliveryService.deliverReport(
        user,
        slackClient,
        linearClient
      );
      results = [result];
    } else {
      // Send to all active users
      results = await ReportDeliveryService.deliverReportToAll(
        slackClient,
        linearClient
      );
    }

    // Calculate summary
    const totalSent = results.length;
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    logger.info('Manual report trigger completed', {
      totalSent,
      successCount,
      failureCount,
      userId,
    });

    res.status(200).json({
      success: true,
      summary: {
        totalSent,
        successCount,
        failureCount,
      },
      results: results.map((r) => ({
        userId: r.userId,
        success: r.success,
        error: r.error,
        issuesCount: r.issuesCount,
        inCooldown: r.inCooldown,
      })),
    });
  } catch (error) {
    logger.error('Error triggering report', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Failed to trigger report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Zod schema for preview report request
 */
const PreviewReportSchema = z.object({
  userId: z.number().int().positive(),
});

/**
 * POST /api/preview-report
 * Generate a report preview without sending it to Slack
 * Body: { userId: number }
 */
reportRouter.post('/preview-report', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const parseResult = PreviewReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('Invalid preview report request', {
        errors: parseResult.error.issues,
        body: req.body,
      });
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
      return;
    }

    const { userId } = parseResult.data;

    // Get credentials from database or environment
    const linearApiKey = await getConfigValue('LINEAR_API_KEY');

    if (!linearApiKey) {
      logger.warn('Linear API key not configured for report preview');
      res.status(503).json({
        error: 'Service credentials not configured',
        message: 'Configure LINEAR_API_KEY via the admin UI or environment variables',
      });
      return;
    }

    // Find the user
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found for report preview: ${userId}`);
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    logger.info('Generating report preview', { userId });

    // Check cache first
    let reportResult = ReportCacheService.getCachedReport(userId);

    if (!reportResult) {
      // Cache miss - generate new report
      const linearClient = new LinearClient({ apiKey: linearApiKey });
      reportResult = await ReportGenerationService.generateReportForUser(
        user,
        linearClient
      );

      // Store in cache for future requests
      ReportCacheService.setCachedReport(userId, reportResult);

      logger.info('Report preview generated and cached', {
        userId,
        issuesCount: reportResult.issuesCount,
        inCooldown: reportResult.inCooldown,
      });
    }

    res.status(200).json({
      success: true,
      preview: {
        reportText: reportResult.reportText,
        issuesCount: reportResult.issuesCount,
        inCooldown: reportResult.inCooldown,
        periodStart: reportResult.periodStart,
        periodEnd: reportResult.periodEnd,
      },
    });
  } catch (error) {
    logger.error('Error generating report preview', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Failed to generate report preview',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
