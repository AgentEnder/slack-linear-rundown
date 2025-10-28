/**
 * User Authentication Middleware
 *
 * Simple authentication for user-facing app routes.
 * For now, uses a basic user ID from cookie/header.
 * TODO: Implement full Slack OAuth flow for production.
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: number;
    }
  }
}

/**
 * Simple authentication middleware
 * Checks for user ID in cookie or X-User-ID header (for development)
 * In production, this should use Slack OAuth tokens
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Try to get user ID from cookie or header (development mode)
    const userIdFromCookie = req.cookies?.userId;
    const userIdFromHeader = req.headers['x-user-id'];
    const userId = userIdFromCookie || userIdFromHeader;

    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication required. Please provide user ID.',
      });
      return;
    }

    // Fetch user from database
    const user = await User.findByPk(Number(userId));

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found.',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed.',
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no user is found
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userIdFromCookie = req.cookies?.userId;
    const userIdFromHeader = req.headers['x-user-id'];
    const userId = userIdFromCookie || userIdFromHeader;

    if (userId) {
      const user = await User.findByPk(Number(userId));
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't fail - just continue without user
    next();
  }
}
