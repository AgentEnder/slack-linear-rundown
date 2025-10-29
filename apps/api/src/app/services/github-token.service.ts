/**
 * GitHub Token Service
 *
 * Handles decryption, refresh, and management of user GitHub OAuth tokens.
 */

import { User } from '@slack-linear-rundown/database';
import { decrypt, encrypt, refreshGitHubToken, isGitHubTokenExpired, type GitHubOAuthConfig } from '@slack-linear-rundown/auth';
import { logger } from '../utils/logger.js';

/**
 * Get a valid GitHub access token for a user
 * Handles decryption and automatic refresh if needed
 *
 * @param user - User object with GitHub OAuth tokens
 * @param encryptionKey - Encryption key for decrypting tokens
 * @returns Decrypted access token, or null if user hasn't connected GitHub
 */
export async function getUserGitHubToken(
  user: User,
  encryptionKey: string
): Promise<string | null> {
  // Check if user has connected GitHub
  if (!user.github_access_token || !user.github_connected_at) {
    return null;
  }

  // Check if token needs refresh
  const needsRefresh =
    user.github_refresh_token &&
    isGitHubTokenExpired(user.github_token_expires_at);

  if (needsRefresh) {
    logger.info('GitHub token expired, attempting refresh', {
      userId: user.id,
      githubUsername: user.github_username,
    });

    try {
      // Decrypt refresh token
      const refreshToken = decrypt(user.github_refresh_token!, encryptionKey);

      // Get OAuth config from environment
      const githubOAuthConfig: GitHubOAuthConfig = {
        clientId: process.env.GITHUB_APP_CLIENT_ID!,
        clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
        redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI || `${process.env.API_URL}/auth/github/callback`,
      };

      // Refresh the token
      const newTokens = await refreshGitHubToken(refreshToken, githubOAuthConfig);

      // Update user with new tokens
      user.github_access_token = encrypt(newTokens.access_token, encryptionKey);
      user.github_refresh_token = encrypt(newTokens.refresh_token, encryptionKey);
      user.github_token_expires_at = new Date(Date.now() + newTokens.expires_in * 1000);
      user.github_scopes = newTokens.scope;

      await user.save();

      logger.info('GitHub token refreshed successfully', {
        userId: user.id,
        githubUsername: user.github_username,
        expiresAt: user.github_token_expires_at,
      });

      return newTokens.access_token;
    } catch (error) {
      logger.error('Failed to refresh GitHub token', {
        userId: user.id,
        githubUsername: user.github_username,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Token refresh failed - user will need to reconnect
      // Clear invalid tokens
      user.github_access_token = null;
      user.github_refresh_token = null;
      user.github_token_expires_at = null;
      user.github_connected_at = null;
      user.github_scopes = null;

      await user.save();

      return null;
    }
  }

  // Token is still valid, decrypt and return
  try {
    return decrypt(user.github_access_token, encryptionKey);
  } catch (error) {
    logger.error('Failed to decrypt GitHub token', {
      userId: user.id,
      githubUsername: user.github_username,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return null;
  }
}

/**
 * Get GitHub token from either user OAuth or shared configuration
 * Prioritizes user's connected GitHub account, falls back to shared token
 *
 * @param user - User object
 * @param encryptionKey - Encryption key for decrypting user tokens
 * @param sharedToken - Optional shared GitHub token from configuration
 * @returns GitHub access token or null
 */
export async function getGitHubTokenWithFallback(
  user: User,
  encryptionKey: string | undefined,
  sharedToken?: string | null
): Promise<string | null> {
  // Try user's connected GitHub first
  if (encryptionKey) {
    const userToken = await getUserGitHubToken(user, encryptionKey);
    if (userToken) {
      logger.info('Using user-specific GitHub token', {
        userId: user.id,
        githubUsername: user.github_username,
      });
      return userToken;
    }
  }

  // Fall back to shared token if available
  if (sharedToken) {
    logger.info('Using shared GitHub token (user has not connected GitHub)', {
      userId: user.id,
    });
    return sharedToken;
  }

  logger.warn('No GitHub token available (user not connected and no shared token)', {
    userId: user.id,
  });

  return null;
}
