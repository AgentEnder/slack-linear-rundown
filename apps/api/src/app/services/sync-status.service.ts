/**
 * Sync Status Service
 *
 * Tracks the status of data syncs (Linear, GitHub, Slack)
 * Provides visibility into when data was last refreshed
 */

import { SyncStatus, SyncType, SyncStatusValue } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger';

export interface SyncMetadata {
  itemsProcessed?: number;
  durationMs?: number;
  [key: string]: any;
}

export interface SyncStatusInfo {
  syncType: SyncType;
  status: SyncStatusValue;
  lastStartedAt: Date | null;
  lastCompletedAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailedAt: Date | null;
  lastErrorMessage: string | null;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  metadata: Record<string, any> | null;
}

/**
 * Start tracking a sync operation
 */
export async function startSync(syncType: SyncType): Promise<void> {
  const now = new Date();

  await SyncStatus.upsert({
    sync_type: syncType,
    status: 'in_progress',
    last_started_at: now,
    total_runs: SyncStatus.sequelize!.literal('total_runs + 1') as any,
  });

  logger.info(`Started ${syncType} sync`, { syncType, startedAt: now });
}

/**
 * Mark a sync as successfully completed
 */
export async function completeSync(
  syncType: SyncType,
  metadata?: SyncMetadata
): Promise<void> {
  const now = new Date();

  const updates: any = {
    sync_type: syncType,
    status: 'success',
    last_completed_at: now,
    last_success_at: now,
    last_error_message: null,
    success_count: SyncStatus.sequelize!.literal('success_count + 1') as any,
  };

  if (metadata) {
    updates.metadata = JSON.stringify(metadata);
  }

  await SyncStatus.upsert(updates);

  logger.info(`Completed ${syncType} sync`, { syncType, completedAt: now, metadata });
}

/**
 * Mark a sync as failed
 */
export async function failSync(syncType: SyncType, error: Error | string): Promise<void> {
  const now = new Date();
  const errorMessage = typeof error === 'string' ? error : error.message;

  await SyncStatus.upsert({
    sync_type: syncType,
    status: 'failed',
    last_completed_at: now,
    last_failed_at: now,
    last_error_message: errorMessage,
    failure_count: SyncStatus.sequelize!.literal('failure_count + 1') as any,
  });

  logger.error(`Failed ${syncType} sync`, { syncType, failedAt: now, error: errorMessage });
}

/**
 * Get sync status for a specific sync type
 */
export async function getSyncStatus(syncType: SyncType): Promise<SyncStatusInfo | null> {
  const syncStatus = await SyncStatus.findOne({
    where: { sync_type: syncType },
  });

  if (!syncStatus) {
    return null;
  }

  return {
    syncType: syncStatus.sync_type,
    status: syncStatus.status,
    lastStartedAt: syncStatus.last_started_at || null,
    lastCompletedAt: syncStatus.last_completed_at || null,
    lastSuccessAt: syncStatus.last_success_at || null,
    lastFailedAt: syncStatus.last_failed_at || null,
    lastErrorMessage: syncStatus.last_error_message || null,
    totalRuns: syncStatus.total_runs,
    successCount: syncStatus.success_count,
    failureCount: syncStatus.failure_count,
    metadata: syncStatus.getMetadata(),
  };
}

/**
 * Get all sync statuses
 */
export async function getAllSyncStatuses(): Promise<SyncStatusInfo[]> {
  const syncStatuses = await SyncStatus.findAll({
    order: [['sync_type', 'ASC']],
  });

  return syncStatuses.map((syncStatus) => ({
    syncType: syncStatus.sync_type,
    status: syncStatus.status,
    lastStartedAt: syncStatus.last_started_at || null,
    lastCompletedAt: syncStatus.last_completed_at || null,
    lastSuccessAt: syncStatus.last_success_at || null,
    lastFailedAt: syncStatus.last_failed_at || null,
    lastErrorMessage: syncStatus.last_error_message || null,
    totalRuns: syncStatus.total_runs,
    successCount: syncStatus.success_count,
    failureCount: syncStatus.failure_count,
    metadata: syncStatus.getMetadata(),
  }));
}

/**
 * Wrapper to execute a sync with automatic status tracking
 */
export async function withSyncTracking<T>(
  syncType: SyncType,
  syncFunction: () => Promise<T>,
  metadataExtractor?: (result: T) => SyncMetadata
): Promise<T> {
  await startSync(syncType);

  const startTime = Date.now();

  try {
    const result = await syncFunction();
    const durationMs = Date.now() - startTime;

    const metadata: SyncMetadata = {
      durationMs,
      ...(metadataExtractor ? metadataExtractor(result) : {}),
    };

    await completeSync(syncType, metadata);

    return result;
  } catch (error) {
    await failSync(syncType, error as Error);
    throw error;
  }
}

/**
 * Get human-readable time since last sync
 */
export function getTimeSinceSync(lastSyncAt: Date | null): string {
  if (!lastSyncAt) {
    return 'Never';
  }

  const now = new Date();
  const diffMs = now.getTime() - lastSyncAt.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
  return 'Just now';
}

/**
 * Get formatted sync status for display
 */
export interface FormattedSyncStatus {
  syncType: string;
  status: SyncStatusValue;
  lastSyncTime: string;
  successRate: string;
  lastError: string | null;
}

export async function getFormattedSyncStatuses(): Promise<FormattedSyncStatus[]> {
  const statuses = await getAllSyncStatuses();

  return statuses.map((status) => {
    const successRate =
      status.totalRuns > 0
        ? `${Math.round((status.successCount / status.totalRuns) * 100)}%`
        : 'N/A';

    return {
      syncType: status.syncType,
      status: status.status,
      lastSyncTime: getTimeSinceSync(status.lastCompletedAt),
      successRate,
      lastError: status.lastErrorMessage,
    };
  });
}
