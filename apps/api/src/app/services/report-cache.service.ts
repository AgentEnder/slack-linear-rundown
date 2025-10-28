/**
 * Report Cache Service
 *
 * Lightweight in-memory cache for generated reports.
 * Prevents regenerating the same report when a user previews and then sends it.
 *
 * Cache TTL: 10 minutes
 */

import type { ReportResult } from './report-generation.service.js';
import { logger } from '../utils/logger.js';

interface CacheEntry {
  data: ReportResult;
  expiresAt: number;
}

// Simple Map-based cache
const cache = new Map<number, CacheEntry>();

// Cache TTL in milliseconds (10 minutes)
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Get a cached report for a user
 * @param userId - Database user ID
 * @returns Cached report result or undefined if not found/expired
 */
export function getCachedReport(userId: number): ReportResult | undefined {
  const entry = cache.get(userId);

  // Check if entry exists and hasn't expired
  if (entry && entry.expiresAt > Date.now()) {
    logger.info(`Cache hit for user ${userId}`, {
      userId,
      expiresIn: Math.round((entry.expiresAt - Date.now()) / 1000) + 's',
    });
    return entry.data;
  }

  // Remove expired entry if it exists
  if (entry) {
    cache.delete(userId);
    logger.info(`Removed expired cache entry for user ${userId}`, { userId });
  }

  logger.info(`Cache miss for user ${userId}`, { userId });
  return undefined;
}

/**
 * Store a generated report in the cache
 * @param userId - Database user ID
 * @param report - Report result to cache
 */
export function setCachedReport(userId: number, report: ReportResult): void {
  const expiresAt = Date.now() + CACHE_TTL_MS;

  cache.set(userId, {
    data: report,
    expiresAt,
  });

  logger.info(`Cached report for user ${userId}`, {
    userId,
    ttlMinutes: CACHE_TTL_MS / 60000,
    issuesCount: report.issuesCount,
    inCooldown: report.inCooldown,
  });

  // Clean up expired entries periodically (every time we add a new entry)
  cleanupExpiredEntries();
}

/**
 * Invalidate the cached report for a user
 * @param userId - Database user ID
 */
export function invalidateCachedReport(userId: number): void {
  const deleted = cache.delete(userId);

  if (deleted) {
    logger.info(`Invalidated cached report for user ${userId}`, { userId });
  }
}

/**
 * Remove all expired entries from the cache
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  let removedCount = 0;

  for (const [userId, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(userId);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    logger.info(`Cleaned up ${removedCount} expired cache entries`);
  }
}

/**
 * Clear all cached reports
 * Useful for testing or administrative purposes
 */
export function clearAllCachedReports(): void {
  const size = cache.size;
  cache.clear();
  logger.info(`Cleared all cached reports (${size} entries)`);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const entry of cache.values()) {
    if (entry.expiresAt > now) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }

  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    ttlMinutes: CACHE_TTL_MS / 60000,
  };
}
