import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifySlackSignature, captureRawBody } from '../middleware/slack-signature-verification.js';
import { logger } from '../utils/logger.js';
import { environment } from '../../environment/environment.js';

export const slackRouter = Router();

/**
 * Zod schema for Slack URL verification challenge
 */
const UrlVerificationSchema = z.object({
  type: z.literal('url_verification'),
  token: z.string(),
  challenge: z.string(),
});

/**
 * Zod schema for Slack event callback
 */
const EventCallbackSchema = z.object({
  type: z.literal('event_callback'),
  token: z.string(),
  team_id: z.string(),
  api_app_id: z.string(),
  event: z.object({
    type: z.string(),
  }).passthrough(),
});

/**
 * POST /slack/events
 * Handle Slack Event API webhooks
 *
 * This endpoint handles:
 * 1. URL verification challenge (during Slack app setup)
 * 2. Event callbacks (for future interactive features)
 *
 * IMPORTANT: Must respond within 3 seconds to Slack
 */
slackRouter.post(
  '/events',
  captureRawBody,
  verifySlackSignature(environment.SLACK_SIGNING_SECRET),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Parse request body
      const body = req.body;

      // Handle URL verification challenge
      if (body.type === 'url_verification') {
        const parseResult = UrlVerificationSchema.safeParse(body);

        if (!parseResult.success) {
          logger.warn('Invalid URL verification request', {
            errors: parseResult.error.issues,
          });
          res.status(400).json({
            error: 'Invalid URL verification request',
          });
          return;
        }

        logger.info('Slack URL verification challenge received', {
          challenge: parseResult.data.challenge.substring(0, 20) + '...',
        });

        // Respond with challenge parameter
        res.status(200).json({
          challenge: parseResult.data.challenge,
        });
        return;
      }

      // Handle event callbacks
      if (body.type === 'event_callback') {
        const parseResult = EventCallbackSchema.safeParse(body);

        if (!parseResult.success) {
          logger.warn('Invalid event callback request', {
            errors: parseResult.error.issues,
          });
          res.status(400).json({
            error: 'Invalid event callback request',
          });
          return;
        }

        const { event } = parseResult.data;

        logger.info('Slack event received', {
          eventType: event.type,
          teamId: parseResult.data.team_id,
        });

        // Respond immediately to Slack (within 3 seconds)
        res.status(200).json({ ok: true });

        // Process event asynchronously (placeholder for future features)
        // In the future, this is where we'd handle:
        // - Interactive component actions
        // - Slash command responses
        // - App mentions
        // - etc.
        processEventAsync(event).catch((error) => {
          logger.error('Error processing Slack event', {
            error: error instanceof Error ? error.message : 'Unknown error',
            eventType: event.type,
          });
        });

        return;
      }

      // Unknown event type
      logger.warn('Unknown Slack event type', {
        type: body.type,
      });

      res.status(400).json({
        error: 'Unknown event type',
      });
    } catch (error) {
      logger.error('Error handling Slack event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Still respond to Slack to prevent retries
      res.status(200).json({ ok: true });
    }
  }
);

/**
 * Process Slack events asynchronously.
 * This is a placeholder for future interactive features.
 *
 * @param event - The Slack event object
 */
async function processEventAsync(event: { type: string }): Promise<void> {
  // Placeholder for future event processing
  // Examples:
  // - Handle app_mention events
  // - Handle message events in DMs
  // - Handle interactive component actions
  // - etc.

  logger.debug('Processing Slack event (placeholder)', {
    eventType: event.type,
  });

  // Future implementation would go here
  // For now, just log the event
}
