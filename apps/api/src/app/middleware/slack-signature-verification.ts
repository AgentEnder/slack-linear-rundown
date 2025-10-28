import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Slack signature verification middleware.
 *
 * Verifies that incoming requests from Slack are authentic by validating
 * the X-Slack-Signature header against the request body.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature(signingSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const slackSignature = req.headers['x-slack-signature'] as string;
      const slackRequestTimestamp = req.headers['x-slack-request-timestamp'] as string;

      if (!slackSignature || !slackRequestTimestamp) {
        logger.warn('Missing Slack signature headers', {
          hasSignature: !!slackSignature,
          hasTimestamp: !!slackRequestTimestamp,
        });
        res.status(401).json({ error: 'Missing Slack signature headers' });
        return;
      }

      // Prevent replay attacks - reject requests older than 5 minutes
      const timestamp = parseInt(slackRequestTimestamp, 10);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = Math.abs(currentTime - timestamp);

      if (timeDiff > 60 * 5) {
        logger.warn('Slack request timestamp too old', {
          timestamp,
          currentTime,
          timeDiff,
        });
        res.status(401).json({ error: 'Request timestamp too old' });
        return;
      }

      // Reconstruct the signing base string
      const rawBody = (req as { rawBody?: string }).rawBody || JSON.stringify(req.body);
      const sigBaseString = `v0:${slackRequestTimestamp}:${rawBody}`;

      // Compute expected signature
      const expectedSignature =
        'v0=' +
        crypto
          .createHmac('sha256', signingSecret)
          .update(sigBaseString)
          .digest('hex');

      // Compare signatures using timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(slackSignature)
      );

      if (!isValid) {
        logger.warn('Invalid Slack signature', {
          received: slackSignature.substring(0, 20) + '...',
          expected: expectedSignature.substring(0, 20) + '...',
        });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Signature is valid, proceed
      next();
    } catch (error) {
      logger.error('Error verifying Slack signature', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to capture raw body for signature verification.
 * Must be applied before express.json() middleware.
 */
export function captureRawBody(req: Request, res: Response, next: NextFunction): void {
  let rawBody = '';

  req.on('data', (chunk) => {
    rawBody += chunk.toString();
  });

  req.on('end', () => {
    (req as { rawBody?: string }).rawBody = rawBody;
    next();
  });
}
