/**
 * Admin routes for managing configuration, users, and message history.
 *
 * These routes provide administrative capabilities including:
 * - Configuration management (encrypted key-value storage)
 * - User management (toggle report delivery)
 * - Message delivery history and statistics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import {
  User,
  ReportDeliveryLog,
  EncryptedConfigService,
} from '@slack-linear-rundown/database';

import { logger } from '../utils/logger.js';
import { environment } from '../../environment/environment.js';
import { getConfigValue, getEncryptionKey } from '../utils/config.js';
import { requireJWTAuth } from '../middleware/jwt-auth.js';

export const adminRouter = Router();

// All admin routes require JWT authentication
adminRouter.use(requireJWTAuth);

/**
 * POST /api/admin/config
 * Set multiple encrypted configuration values at once
 * Body: { SLACK_BOT_TOKEN?, LINEAR_API_KEY?, SLACK_SIGNING_SECRET?, REPORT_SCHEDULE? }
 */
adminRouter.post(
  '/admin/config',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const encryptionKey = getEncryptionKey(res);
      if (!encryptionKey) return;

      const ConfigSchema = z.object({
        SLACK_BOT_TOKEN: z.string().optional(),
        LINEAR_API_KEY: z.string().optional(),
        SLACK_SIGNING_SECRET: z.string().optional(),
        REPORT_SCHEDULE: z.string().optional(),
      });

      const parseResult = ConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues,
        });
        return;
      }

      const config = parseResult.data;
      let updatedCount = 0;

      for (const [key, value] of Object.entries(config)) {
        if (value) {
          await EncryptedConfigService.set(key, value, encryptionKey);
          updatedCount++;
          logger.info(`Config key updated: ${key}`);
        }
      }

      res.status(200).json({
        success: true,
        message: `${updatedCount} configuration value(s) updated`,
        updatedKeys: Object.keys(config).filter(
          (k) => config[k as keyof typeof config]
        ),
      });
    } catch (error) {
      logger.error('Error setting configuration', { error });
      res.status(500).json({
        error: 'Failed to set configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/status
 * Get status of all configuration keys with their sources and API connectivity
 */
adminRouter.get(
  '/admin/status',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const encryptionKey = getEncryptionKey(res);
      if (!encryptionKey) return;

      const configKeys = [
        'SLACK_BOT_TOKEN',
        'LINEAR_API_KEY',
        'SLACK_SIGNING_SECRET',
        'REPORT_SCHEDULE',
      ] as const;

      interface ConfigStatus {
        configured: boolean;
        source: 'database' | 'environment' | 'none';
        decryptionError: boolean;
        apiWorking: boolean | null;
        apiDetails: Record<string, unknown> | null;
        apiError: string | null;
      }

      const status: Record<string, ConfigStatus> = {};

      // Check each config key
      for (const key of configKeys) {
        logger.info(`Checking config key: ${key}`);

        let value: string | null = null;
        let decryptionError = false;
        let source: 'database' | 'environment' | 'none' = 'none';

        // Check if config exists in database
        logger.info(`Querying database for key: ${key}`);
        const dbKey = await EncryptedConfigService.getSource(key);
        logger.info(
          `Database query result for ${key}: ${dbKey ? 'found' : 'not found'}`
        );

        // Try to get the value from database first
        if (dbKey) {
          try {
            logger.info(`Attempting to decrypt value for key: ${key}`);
            value = await EncryptedConfigService.get(key, encryptionKey);
            source = 'database';
            logger.info(
              `Successfully retrieved and decrypted value for ${key}`
            );
          } catch (error) {
            logger.error(`Failed to decrypt value for ${key}`, { error });
            decryptionError = true;
            source = 'database';
          }
        }

        // If not in database, check environment variables
        if (!value && !dbKey) {
          logger.info(`Checking environment for key: ${key}`);
          const envValue = environment[key as keyof typeof environment];
          if (envValue !== undefined && envValue !== null && envValue !== '') {
            value = String(envValue);
            source = 'environment';
            logger.info(`Found ${key} in environment variables`);
          } else {
            logger.info(`Key ${key} not found in environment`);
          }
        }

        status[key] = {
          configured: !!value,
          source,
          decryptionError,
          apiWorking: null,
          apiDetails: null,
          apiError: null,
        };

        // Test API connectivity for Slack and Linear
        if (value && !decryptionError) {
          if (key === 'SLACK_BOT_TOKEN') {
            try {
              const slackClient = new SlackClient({ botToken: value });
              const authTest = await slackClient['client'].auth.test();

              if (authTest.ok) {
                status[key].apiWorking = true;
                status[key].apiDetails = {
                  team: authTest.team as string,
                  user: authTest.user as string,
                  userId: authTest.user_id as string,
                };
              } else {
                status[key].apiWorking = false;
                status[key].apiError = authTest.error || 'Unknown error';
              }
            } catch (error) {
              status[key].apiWorking = false;
              status[key].apiError =
                error instanceof Error ? error.message : 'Unknown error';
            }
          } else if (key === 'LINEAR_API_KEY') {
            try {
              const linearClient = new LinearClient({ apiKey: value });
              const viewer = await linearClient.getCurrentUser();

              status[key].apiWorking = true;
              status[key].apiDetails = {
                name: viewer.name,
                email: viewer.email,
                id: viewer.id,
              };
            } catch (error) {
              status[key].apiWorking = false;
              status[key].apiError =
                error instanceof Error ? error.message : 'Unknown error';
            }
          }
        }
      }

      res.status(200).json({
        success: true,
        status,
      });
    } catch (error) {
      logger.error('Error checking configuration status', { error });
      res.status(500).json({
        error: 'Failed to check configuration status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * DELETE /api/admin/config/:key
 * Delete an encrypted configuration key
 */
adminRouter.delete(
  '/admin/config/:key',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const encryptionKey = getEncryptionKey(res);
      if (!encryptionKey) return;

      const key = req.params.key;

      if (
        ![
          'SLACK_BOT_TOKEN',
          'LINEAR_API_KEY',
          'SLACK_SIGNING_SECRET',
          'REPORT_SCHEDULE',
        ].includes(key)
      ) {
        res.status(400).json({
          error: 'Invalid configuration key',
          message:
            'Key must be one of: SLACK_BOT_TOKEN, LINEAR_API_KEY, SLACK_SIGNING_SECRET, REPORT_SCHEDULE',
        });
        return;
      }

      const deleted = await EncryptedConfigService.deleteKey(key);

      if (deleted) {
        logger.info(`Config key deleted: ${key}`);
        res.status(200).json({
          success: true,
          message: `Configuration key ${key} has been deleted`,
        });
      } else {
        res.status(404).json({
          error: 'Key not found',
          message: `Configuration key ${key} does not exist`,
        });
      }
    } catch (error) {
      logger.error('Error deleting configuration key', { error });
      res.status(500).json({
        error: 'Failed to delete configuration key',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/test-slack
 * Test Slack API connection using stored credentials
 */
adminRouter.post(
  '/admin/test-slack',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const encryptionKey = getEncryptionKey(res);
      if (!encryptionKey) return;

      const botToken = await getConfigValue('SLACK_BOT_TOKEN', encryptionKey);
      if (!botToken) {
        res.status(400).json({
          error: 'Slack bot token not configured',
          message: 'Set SLACK_BOT_TOKEN in database or environment variables',
        });
        return;
      }

      const slackClient = new SlackClient({ botToken });
      const users = await slackClient.getUsers();

      res.status(200).json({
        success: true,
        message: 'Slack connection successful',
        userCount: users.length,
      });
    } catch (error) {
      logger.error('Slack connection test failed', { error });
      res.status(500).json({
        error: 'Slack connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/admin/test-linear
 * Test Linear API connection using stored credentials
 */
adminRouter.post(
  '/admin/test-linear',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const encryptionKey = getEncryptionKey(res);
      if (!encryptionKey) return;

      const apiKey = await getConfigValue('LINEAR_API_KEY', encryptionKey);
      if (!apiKey) {
        res.status(400).json({
          error: 'Linear API key not configured',
          message: 'Set LINEAR_API_KEY in database or environment variables',
        });
        return;
      }

      const linearClient = new LinearClient({ apiKey });
      const viewer = await linearClient.getCurrentUser();

      res.status(200).json({
        success: true,
        message: 'Linear connection successful',
        user: viewer.name,
        email: viewer.email,
      });
    } catch (error) {
      logger.error('Linear connection test failed', { error });
      res.status(500).json({
        error: 'Linear connection failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/users
 * Get all users with their status
 */
adminRouter.get(
  '/admin/users',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await User.findAll({
        order: [['email', 'ASC']],
      });

      res.status(200).json({
        success: true,
        users: users.map((u) => u.toJSON()),
        count: users.length,
      });
    } catch (error) {
      logger.error('Error fetching users', { error });
      res.status(500).json({
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * PUT /api/admin/users/:userId/receive-reports
 * Update user's receive_reports preference
 * Body: { enabled: boolean }
 */
adminRouter.put(
  '/admin/users/:userId/receive-reports',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (isNaN(userId) || userId <= 0) {
        res.status(400).json({ error: 'Invalid userId parameter' });
        return;
      }

      const EnabledSchema = z.object({
        enabled: z.boolean(),
      });

      const parseResult = EnabledSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: 'Invalid request body',
          details: parseResult.error.issues,
        });
        return;
      }

      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await user.update({ receive_reports: parseResult.data.enabled });

      logger.info(`User ${userId} receive_reports updated`, {
        userId,
        enabled: parseResult.data.enabled,
      });

      res.status(200).json({
        success: true,
        message: 'User preference updated',
        userId,
        enabled: parseResult.data.enabled,
      });
    } catch (error) {
      logger.error('Error updating user preference', { error });
      res.status(500).json({
        error: 'Failed to update user preference',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/admin/deliveries
 * Get report delivery history with optional filters
 * Query params: status?, userId?, days?
 */
adminRouter.get(
  '/admin/deliveries',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, userId, days } = req.query;
      const { Op } = await import('sequelize');

      const where: any = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (userId && userId !== 'all') {
        where.user_id = parseInt(userId as string, 10);
      }

      if (days && days !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days as string, 10));
        where.sent_at = { [Op.gte]: daysAgo };
      }

      const deliveries = await ReportDeliveryLog.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ['email', 'slack_real_name', 'linear_name'],
          },
        ],
        order: [['sent_at', 'DESC']],
        limit: 1000,
      });

      // Transform deliveries to flatten user data for easier frontend consumption
      const deliveriesWithUserData = deliveries.map((d) => {
        const delivery = d.toJSON() as any;
        if (delivery.user) {
          delivery.user_email = delivery.user.email;
          delivery.user_name = delivery.user.slack_real_name || delivery.user.linear_name;
          delete delivery.user;
        }
        return delivery;
      });

      res.status(200).json({
        success: true,
        deliveries: deliveriesWithUserData,
        count: deliveries.length,
      });
    } catch (error) {
      logger.error('Error fetching deliveries', { error });
      res.status(500).json({
        error: 'Failed to fetch delivery history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);
