import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '@slack-linear-rundown/database';
import * as CooldownService from '../services/cooldown.service.js';
import { logger } from '../utils/logger.js';

export const cooldownRouter = Router();

/**
 * Zod schema for setting/updating cooldown schedule
 */
const SetCooldownSchema = z.object({
  userId: z.number().int().positive(),
  nextStart: z.string().refine(
    (date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    },
    { message: 'Invalid date format. Use ISO date string (YYYY-MM-DD)' }
  ),
  durationWeeks: z.number().int().min(1).max(52),
});

/**
 * POST /api/cooldown/set
 * Set or update a user's cooldown schedule
 */
cooldownRouter.post('/cooldown/set', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const parseResult = SetCooldownSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn('Invalid cooldown set request', {
        errors: parseResult.error.issues,
        body: req.body,
      });
      res.status(400).json({
        error: 'Invalid request body',
        details: parseResult.error.issues,
      });
      return;
    }

    const { userId, nextStart, durationWeeks } = parseResult.data;

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found for cooldown set: ${userId}`);
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Update cooldown schedule
    const scheduleId = await CooldownService.updateCooldownSchedule(
      userId,
      nextStart,
      durationWeeks
    );

    logger.info(`Cooldown schedule set for user ${userId}`, {
      userId,
      nextStart,
      durationWeeks,
      scheduleId,
    });

    res.status(200).json({
      success: true,
      scheduleId,
      userId,
      nextStart,
      durationWeeks,
    });
  } catch (error) {
    logger.error('Error setting cooldown schedule', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      error: 'Failed to set cooldown schedule',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/cooldown/:userId
 * Get a user's cooldown schedule
 */
cooldownRouter.get('/cooldown/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({
        error: 'Invalid userId parameter',
      });
      return;
    }

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found for cooldown get: ${userId}`);
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Get cooldown schedule
    const cooldownStatus = await CooldownService.getCooldownSchedule(userId);

    if (!cooldownStatus.isInCooldown && !cooldownStatus.startDate) {
      res.status(404).json({
        error: 'No cooldown schedule found for this user',
      });
      return;
    }

    res.status(200).json({
      userId,
      isInCooldown: cooldownStatus.isInCooldown,
      weekNumber: cooldownStatus.weekNumber,
      totalWeeks: cooldownStatus.totalWeeks,
      startDate: cooldownStatus.startDate?.toISOString(),
      endDate: cooldownStatus.endDate?.toISOString(),
    });
  } catch (error) {
    logger.error('Error getting cooldown schedule', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.params.userId,
    });

    res.status(500).json({
      error: 'Failed to get cooldown schedule',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/cooldown/:userId
 * Delete a user's cooldown schedule
 */
cooldownRouter.delete('/cooldown/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({
        error: 'Invalid userId parameter',
      });
      return;
    }

    // Verify user exists
    const user = await User.findByPk(userId);
    if (!user) {
      logger.warn(`User not found for cooldown delete: ${userId}`);
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    // Delete cooldown schedule
    await CooldownService.deleteCooldownSchedule(userId);

    logger.info(`Cooldown schedule deleted for user ${userId}`);

    res.status(200).json({
      success: true,
      userId,
    });
  } catch (error) {
    logger.error('Error deleting cooldown schedule', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.params.userId,
    });

    res.status(500).json({
      error: 'Failed to delete cooldown schedule',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
