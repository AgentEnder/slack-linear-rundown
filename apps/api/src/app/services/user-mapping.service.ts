/**
 * User Mapping Service
 *
 * Manages synchronization between Slack and Linear users with the local database.
 * Fetches users from both platforms and maintains active user mappings.
 */

import { User, getDatabase } from '@slack-linear-rundown/database';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import { logger } from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Synchronize Slack users with the database and match with Linear users.
 * Fetches all Slack users, matches them with Linear users by email,
 * and sets receive_reports based on whether there's a Linear match.
 *
 * @param slackClient - Initialized Slack client
 * @param linearClient - Optional initialized Linear client for user matching
 * @returns Promise<void>
 */
export async function syncSlackUsers(
  slackClient: SlackClient,
  linearClient?: LinearClient
): Promise<void> {
  logger.info('Starting Slack user sync...');

  try {
    // Fetch all Slack users
    const slackUsers = await slackClient.getUsers();
    logger.info(`Fetched ${slackUsers.length} users from Slack`);

    // Fetch Linear users if client is provided
    let linearUsersByEmail: Map<string, { id: string; name: string }> = new Map();
    if (linearClient) {
      try {
        const linearUsers = await linearClient.getAllUsers();
        logger.info(`Fetched ${linearUsers.length} users from Linear`);

        linearUsers.forEach((user) => {
          if (user.email) {
            linearUsersByEmail.set(user.email.toLowerCase(), {
              id: user.id,
              name: user.name,
            });
          }
        });
        logger.info(`Mapped ${linearUsersByEmail.size} Linear users by email`);
      } catch (error) {
        logger.warn('Failed to fetch Linear users, continuing without Linear mapping', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const sequelize = getDatabase();

    // Use transaction for bulk operations
    await sequelize.transaction(async (transaction) => {
      // Upsert all Slack users
      for (const slackUser of slackUsers) {
        const emailLower = slackUser.email.toLowerCase();
        const linearMatch = linearUsersByEmail.get(emailLower);

        // Find existing user to preserve receive_reports if already set
        const existingUser = await User.findOne({
          where: { email: slackUser.email },
          transaction,
        });

        await User.upsert(
          {
            email: slackUser.email,
            slack_user_id: slackUser.id,
            slack_real_name: slackUser.realName,
            linear_user_id: linearMatch?.id || existingUser?.linear_user_id || null,
            linear_name: linearMatch?.name || existingUser?.linear_name || null,
            is_active: true,
            // If user already exists, keep their receive_reports preference
            // Otherwise, only enable reports if they have a Linear match
            receive_reports: existingUser
              ? existingUser.receive_reports
              : !!linearMatch,
          },
          { transaction }
        );
      }

      // Mark users not in the provided list as inactive
      // (only if they have slack_user_id set, meaning they were synced from Slack)
      const emails = slackUsers.map((u) => u.email);
      if (emails.length > 0) {
        await User.update(
          { is_active: false },
          {
            where: {
              email: { [Op.notIn]: emails },
              slack_user_id: { [Op.ne]: null },
              is_active: true,
            },
            transaction,
          }
        );
      }
    });

    logger.info(
      `Successfully synced ${slackUsers.length} Slack users to database`
    );
  } catch (error) {
    logger.error('Failed to sync Slack users', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get a user by email address.
 *
 * @param email - Email address to search for
 * @returns User if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    return await User.findOne({ where: { email } });
  } catch (error) {
    logger.error(`Failed to get user by email: ${email}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get a user by Slack user ID.
 *
 * @param slackUserId - Slack user ID to search for
 * @returns User if found, null otherwise
 */
export async function getUserBySlackId(slackUserId: string): Promise<User | null> {
  try {
    return await User.findOne({ where: { slack_user_id: slackUserId } });
  } catch (error) {
    logger.error(`Failed to get user by Slack ID: ${slackUserId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get a user by Linear user ID.
 *
 * @param linearUserId - Linear user ID to search for
 * @returns User if found, null otherwise
 */
export async function getUserByLinearId(linearUserId: string): Promise<User | null> {
  try {
    return await User.findOne({ where: { linear_user_id: linearUserId } });
  } catch (error) {
    logger.error(`Failed to get user by Linear ID: ${linearUserId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get all active users.
 *
 * @returns Array of active users
 */
export async function getActiveUsers(): Promise<User[]> {
  try {
    return await User.findAll({ where: { is_active: true } });
  } catch (error) {
    logger.error('Failed to get active users', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}

/**
 * Get all users who should receive reports.
 * Returns active users with receive_reports enabled.
 *
 * @returns Array of users who should receive reports
 */
export async function getReportRecipients(): Promise<User[]> {
  try {
    return await User.findAll({
      where: {
        is_active: true,
        receive_reports: true,
      },
      order: [['email', 'ASC']],
    });
  } catch (error) {
    logger.error('Failed to get report recipients', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
