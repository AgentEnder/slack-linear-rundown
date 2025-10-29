/**
 * User-related utility functions
 */

import type { User, Message } from '@slack-linear-rundown/shared-types';

/**
 * Get the display name for a user, preferring real name over email
 */
export function getUserDisplayName(user: User): string {
  return user.slack_real_name || user.linear_name || user.email;
}

/**
 * Get the display name for a message recipient
 */
export function getMessageUserDisplay(message: Message): string {
  return message.user_name || message.user_email || `User #${message.user_id}`;
}
