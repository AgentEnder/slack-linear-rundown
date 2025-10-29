/**
 * Sync Status Routes
 *
 * API endpoints for viewing sync status and manually triggering syncs.
 * Provides visibility into data freshness for admin and user apps.
 */

import { Router, Request, Response } from 'express';
import * as SyncStatusService from '../services/sync-status.service.js';
import type { SyncType } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/sync-status
 * Get all sync statuses (formatted for display)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const statuses = await SyncStatusService.getFormattedSyncStatuses();
    res.json(statuses);
  } catch (error) {
    logger.error('Failed to get sync statuses', { error });
    res.status(500).json({
      error: 'Failed to get sync statuses',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync-status/:syncType
 * Get detailed status for a specific sync type
 */
router.get('/:syncType', async (req: Request, res: Response) => {
  try {
    const syncType = req.params.syncType as SyncType;

    // Validate sync type
    const validTypes: SyncType[] = ['linear_issues', 'github_data', 'slack_users'];
    if (!validTypes.includes(syncType)) {
      return res.status(400).json({
        error: 'Invalid sync type',
        validTypes,
      });
    }

    const status = await SyncStatusService.getSyncStatus(syncType);

    if (!status) {
      return res.status(404).json({
        error: 'Sync status not found',
        syncType,
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to get sync status', {
      syncType: req.params.syncType,
      error,
    });
    res.status(500).json({
      error: 'Failed to get sync status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/sync-status/user/summary
 * Get simplified sync status for current user
 * Shows last sync times in human-readable format
 */
router.get('/user/summary', async (req: Request, res: Response) => {
  try {
    const statuses = await SyncStatusService.getAllSyncStatuses();

    const linearStatus = statuses.find((s) => s.syncType === 'linear_issues');
    const githubStatus = statuses.find((s) => s.syncType === 'github_data');

    const summary = {
      linearLastSync: linearStatus?.lastCompletedAt || null,
      linearLastSyncFormatted: SyncStatusService.getTimeSinceSync(
        linearStatus?.lastCompletedAt || null
      ),
      githubLastSync: githubStatus?.lastCompletedAt || null,
      githubLastSyncFormatted: SyncStatusService.getTimeSinceSync(
        githubStatus?.lastCompletedAt || null
      ),
      dataFreshness:
        linearStatus?.lastCompletedAt || githubStatus?.lastCompletedAt
          ? SyncStatusService.getTimeSinceSync(
              new Date(
                Math.max(
                  linearStatus?.lastCompletedAt?.getTime() || 0,
                  githubStatus?.lastCompletedAt?.getTime() || 0
                )
              )
            )
          : 'Never',
    };

    res.json(summary);
  } catch (error) {
    logger.error('Failed to get user sync summary', { error });
    res.status(500).json({
      error: 'Failed to get sync summary',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
