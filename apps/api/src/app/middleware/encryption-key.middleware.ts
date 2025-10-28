/**
 * Middleware to validate that ENCRYPTION_KEY environment variable is configured.
 *
 * This middleware should be applied to admin routes that require encryption
 * capabilities for storing sensitive configuration values.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Middleware that validates ENCRYPTION_KEY environment variable exists.
 * Returns 503 Service Unavailable if the key is not configured.
 */
export function requireEncryptionKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey.trim() === '') {
    logger.warn('Admin endpoint accessed without ENCRYPTION_KEY configured', {
      path: req.path,
      method: req.method,
    });

    res.status(503).json({
      error: 'Service unavailable',
      message:
        'ENCRYPTION_KEY environment variable must be configured to use admin configuration endpoints. ' +
        'Please set a secure encryption key in your environment.',
    });
    return;
  }

  next();
}
