/**
 * JWT Authentication Middleware
 * Validates JWT tokens from cookies and attaches user info to request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, type JWTPayload } from '@slack-linear-rundown/auth';
import { User } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: number;
      jwtPayload?: JWTPayload;
    }
  }
}

/**
 * Middleware to require JWT authentication
 * Rejects requests without valid JWT token
 */
export async function requireJWTAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify token
    const payload = verifyToken(accessToken, process.env.JWT_SECRET!);

    // Attach payload to request
    req.jwtPayload = payload;
    req.userId = payload.userId;

    // Optionally fetch full user from database
    const user = await User.findByPk(payload.userId);
    if (!user || !user.is_active) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('JWT authentication failed', { error });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to optionally attach user if JWT is present
 * Does not reject requests without token
 */
export async function optionalJWTAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      next();
      return;
    }

    // Verify token
    const payload = verifyToken(accessToken, process.env.JWT_SECRET!);

    // Attach payload to request
    req.jwtPayload = payload;
    req.userId = payload.userId;

    // Fetch user from database
    const user = await User.findByPk(payload.userId);
    if (user && user.is_active) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Token invalid, but don't reject request
    logger.debug('Optional JWT auth failed', { error });
    next();
  }
}
