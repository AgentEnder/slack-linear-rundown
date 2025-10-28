/**
 * Cooldown Service
 *
 * Manages cooldown period tracking and filtering.
 * Determines if users are in cooldown and filters issues accordingly.
 */

import { CooldownSchedule } from '@slack-linear-rundown/database';
import type { LinearIssue } from '@slack-linear-rundown/linear';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Cooldown status result with calculated metadata.
 */
export interface CooldownStatusResult {
  isInCooldown: boolean;
  weekNumber?: number;
  totalWeeks?: number;
  endDate?: Date;
  startDate?: Date;
}

/**
 * Check if a user is currently in cooldown on a given date.
 *
 * @param userId - Database user ID
 * @param date - Date to check (defaults to current date)
 * @returns True if user is in cooldown, false otherwise
 */
export async function isUserInCooldown(userId: number, date: Date = new Date()): Promise<boolean> {
  try {
    const dateStr = date.toISOString().split('T')[0];

    const count = await CooldownSchedule.count({
      where: {
        user_id: userId,
        next_cooldown_start: { [Op.lte]: dateStr },
        // For SQLite, we need to calculate end date manually
        // We'll check this in a separate query
      },
    });

    if (count === 0) return false;

    // Get the schedule to check end date
    const schedule = await CooldownSchedule.findOne({
      where: { user_id: userId },
    });

    if (!schedule) return false;

    const startDate = new Date(schedule.next_cooldown_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + schedule.cooldown_duration_weeks * 7);

    return date >= startDate && date < endDate;
  } catch (error) {
    logger.error(`Failed to check cooldown status for user ${userId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get a user's cooldown schedule with calculated metadata.
 *
 * @param userId - Database user ID
 * @param currentDate - Date to calculate metadata for (defaults to current date)
 * @returns Cooldown status with metadata, or null if no schedule exists
 */
export async function getCooldownSchedule(
  userId: number,
  currentDate: Date = new Date()
): Promise<CooldownStatusResult> {
  try {
    const schedule = await CooldownSchedule.findOne({
      where: { user_id: userId },
    });

    if (!schedule) {
      return { isInCooldown: false };
    }

    const inCooldown = await isUserInCooldown(userId, currentDate);

    if (!inCooldown) {
      return { isInCooldown: false };
    }

    // Calculate metadata
    const startDate = new Date(schedule.next_cooldown_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + schedule.cooldown_duration_weeks * 7);

    // Calculate which week of cooldown we're in
    const daysSinceStart = Math.floor(
      (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekNumber = Math.floor(daysSinceStart / 7) + 1;

    return {
      isInCooldown: true,
      weekNumber,
      totalWeeks: schedule.cooldown_duration_weeks,
      endDate,
      startDate,
    };
  } catch (error) {
    logger.error(`Failed to get cooldown schedule for user ${userId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { isInCooldown: false };
  }
}

/**
 * Update or create a cooldown schedule for a user.
 *
 * @param userId - Database user ID
 * @param nextStart - ISO date string for next cooldown start
 * @param durationWeeks - Duration in weeks
 * @returns The ID of the cooldown schedule
 */
export async function updateCooldownSchedule(
  userId: number,
  nextStart: string,
  durationWeeks: number
): Promise<number> {
  try {
    const [schedule] = await CooldownSchedule.upsert({
      user_id: userId,
      next_cooldown_start: nextStart,
      cooldown_duration_weeks: durationWeeks,
    });

    logger.info(`Updated cooldown schedule for user ${userId}`, {
      userId,
      nextStart,
      durationWeeks,
      scheduleId: schedule.id,
    });

    return schedule.id;
  } catch (error) {
    logger.error(`Failed to update cooldown schedule for user ${userId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      nextStart,
      durationWeeks,
    });
    throw error;
  }
}

/**
 * Delete a user's cooldown schedule.
 *
 * @param userId - Database user ID
 */
export async function deleteCooldownSchedule(userId: number): Promise<void> {
  try {
    await CooldownSchedule.destroy({
      where: { user_id: userId },
    });
    logger.info(`Deleted cooldown schedule for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to delete cooldown schedule for user ${userId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get all users currently in cooldown on a given date.
 *
 * @param date - The date to check (defaults to current date)
 * @returns Array of user IDs currently in cooldown
 */
export async function getUsersInCooldown(date: Date = new Date()): Promise<number[]> {
  try {
    const schedules = await CooldownSchedule.findAll();
    const userIds: number[] = [];

    for (const schedule of schedules) {
      const inCooldown = await isUserInCooldown(schedule.user_id, date);
      if (inCooldown) {
        userIds.push(schedule.user_id);
      }
    }

    return userIds;
  } catch (error) {
    logger.error('Failed to get users in cooldown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Filter issues for cooldown mode.
 *
 * CRITICAL LOGIC:
 * - Include issues WITHOUT a project (unboarded work)
 * - Include issues from projects with "misc" or "DPE" in name (case-insensitive)
 * - Exclude all other project board issues
 *
 * @param issues - Array of Linear issues
 * @returns Filtered array of issues appropriate for cooldown
 */
export function filterIssuesForCooldown(issues: LinearIssue[]): LinearIssue[] {
  return issues.filter((issue) => {
    // Include if no project (unboarded work)
    if (!issue.project) {
      return true;
    }

    // Include if project name contains 'misc' or 'dpe' (case-insensitive)
    const projectName = issue.project.name.toLowerCase();
    if (projectName.includes('misc') || projectName.includes('dpe')) {
      return true;
    }

    // Exclude all other project board issues
    return false;
  });
}
