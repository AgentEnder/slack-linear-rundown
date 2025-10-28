import { WebClient } from '@slack/web-api';
import type {
  SlackUser,
  SlackMessage,
  SlackDeliveryResult,
} from './types.js';

/**
 * Configuration options for SlackClient.
 */
export interface SlackClientConfig {
  botToken: string;
  rateLimitDelay?: number; // Delay in ms between messages (default: 1000)
}

/**
 * Client for interacting with the Slack Web API.
 * Handles user fetching, message delivery, rate limiting, and error handling.
 */
export class SlackClient {
  private client: WebClient;
  private rateLimitDelay: number;
  private lastMessageTime: number = 0;

  constructor(config: SlackClientConfig) {
    if (!config.botToken) {
      throw new Error('Slack bot token is required');
    }

    this.client = new WebClient(config.botToken);
    this.rateLimitDelay = config.rateLimitDelay ?? 1000; // Default: 1 message per second
  }

  /**
   * Fetches all users in the workspace with pagination support.
   * Returns users with their email addresses and profile information.
   *
   * @returns Promise<SlackUser[]> - Array of workspace users
   * @throws Error if the API call fails
   */
  async getUsers(): Promise<SlackUser[]> {
    const users: SlackUser[] = [];
    let cursor: string | undefined;

    try {
      do {
        const response = await this.client.users.list({
          cursor,
          limit: 200, // Max allowed by Slack API
        });

        if (!response.ok || !response.members) {
          throw new Error(`Failed to fetch users: ${response.error || 'Unknown error'}`);
        }

        for (const member of response.members) {
          // Skip bots and deleted users
          if (member.is_bot || member.deleted || !member.profile?.email) {
            continue;
          }

          users.push({
            id: member.id as string,
            email: member.profile.email,
            realName: member.real_name || member.profile.real_name || 'Unknown',
            profile: {
              firstName: member.profile.first_name,
              lastName: member.profile.last_name,
              displayName: member.profile.display_name,
              image: member.profile.image_72,
            },
          });
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      return users;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Slack users: ${error.message}`);
      }
      throw new Error('Failed to fetch Slack users: Unknown error');
    }
  }

  /**
   * Sends a direct message to a user.
   * Handles rate limiting automatically by enforcing a delay between messages.
   *
   * @param userId - Slack user ID
   * @param message - Message to send
   * @returns Promise<SlackDeliveryResult> - Delivery result with success status
   */
  async sendDM(
    userId: string,
    message: SlackMessage
  ): Promise<SlackDeliveryResult> {
    // Enforce rate limiting
    await this.enforceRateLimit();

    try {
      // Open DM conversation
      const conversationResponse = await this.client.conversations.open({
        users: userId,
      });

      if (!conversationResponse.ok || !conversationResponse.channel) {
        return {
          success: false,
          error: `Failed to open conversation: ${conversationResponse.error || 'Unknown error'}`,
        };
      }

      const channelId = conversationResponse.channel.id as string;

      // Send message
      const messageResponse = await this.client.chat.postMessage({
        channel: channelId,
        text: message.text,
        ...(message.blocks && { blocks: message.blocks }),
      });

      if (!messageResponse.ok) {
        return {
          success: false,
          error: `Failed to send message: ${messageResponse.error || 'Unknown error'}`,
          channelId,
        };
      }

      return {
        success: true,
        channelId,
        timestamp: messageResponse.ts as string,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Enforces rate limiting by waiting if necessary.
   * Ensures messages are sent no faster than the configured rate limit.
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastMessage = now - this.lastMessageTime;

    if (timeSinceLastMessage < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastMessage;
      await this.sleep(waitTime);
    }

    this.lastMessageTime = Date.now();
  }

  /**
   * Sleep utility for rate limiting.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handles errors from Slack API calls and returns a structured result.
   */
  private handleError(error: unknown): SlackDeliveryResult {
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for common Slack API errors
      if (errorMessage.includes('user_not_found')) {
        return {
          success: false,
          error: 'User not found in Slack workspace',
        };
      }

      if (errorMessage.includes('channel_not_found')) {
        return {
          success: false,
          error: 'Channel not found or inaccessible',
        };
      }

      if (errorMessage.includes('not_in_channel')) {
        return {
          success: false,
          error: 'Bot is not in the channel',
        };
      }

      if (errorMessage.includes('rate_limited') || errorMessage.includes('ratelimited')) {
        return {
          success: false,
          error: 'Rate limit exceeded - please retry later',
        };
      }

      if (errorMessage.includes('invalid_auth') || errorMessage.includes('token_revoked')) {
        return {
          success: false,
          error: 'Invalid or revoked authentication token',
        };
      }

      if (errorMessage.includes('account_inactive')) {
        return {
          success: false,
          error: 'Slack account is inactive',
        };
      }

      if (errorMessage.includes('is_archived')) {
        return {
          success: false,
          error: 'Channel is archived',
        };
      }

      return {
        success: false,
        error: `Slack API error: ${errorMessage}`,
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred while sending message',
    };
  }
}
