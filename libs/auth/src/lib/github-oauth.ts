/**
 * GitHub OAuth Utilities
 * Helpers for GitHub App OAuth flow
 */

import crypto from 'crypto';

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GitHubOAuthState {
  state: string;
  redirectTo?: string;
}

/**
 * Generate a secure random string for state
 */
export function generateGitHubOAuthState(redirectTo?: string): GitHubOAuthState {
  return {
    state: crypto.randomBytes(32).toString('hex'),
    redirectTo,
  };
}

/**
 * Build GitHub OAuth authorization URL
 * @param config OAuth configuration
 * @param state CSRF protection state
 * @returns Authorization URL to redirect user to
 */
export function buildGitHubAuthorizationUrl(
  config: GitHubOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'repo read:user user:email',
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeGitHubCodeForToken(
  code: string,
  config: GitHubOAuthConfig
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  if (data.error) {
    throw new Error(`GitHub token exchange failed: ${data.error_description || data.error}`);
  }

  return {
    access_token: data.access_token as string,
    token_type: data.token_type as string,
    scope: data.scope as string,
    refresh_token: data.refresh_token as string | undefined,
    expires_in: data.expires_in as number | undefined,
    refresh_token_expires_in: data.refresh_token_expires_in as number | undefined,
  };
}

/**
 * Fetch GitHub user info
 */
export async function fetchGitHubUserInfo(accessToken: string): Promise<{
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user info: ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  return {
    id: data.id as number,
    login: data.login as string,
    name: data.name as string | null,
    email: data.email as string | null,
    avatar_url: data.avatar_url as string,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
  };
}

/**
 * Refresh GitHub access token (for GitHub Apps with expiring tokens)
 */
export async function refreshGitHubToken(
  refreshToken: string,
  config: GitHubOAuthConfig
): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token refresh failed: ${response.statusText}`);
  }

  const data = (await response.json()) as any;

  if (data.error) {
    throw new Error(`GitHub token refresh failed: ${data.error_description || data.error}`);
  }

  return {
    access_token: data.access_token as string,
    token_type: data.token_type as string,
    scope: data.scope as string,
    expires_in: data.expires_in as number,
    refresh_token: data.refresh_token as string,
    refresh_token_expires_in: data.refresh_token_expires_in as number,
  };
}

/**
 * Check if GitHub token has expired
 */
export function isGitHubTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    // If no expiration date, assume token doesn't expire (legacy OAuth Apps)
    return false;
  }

  // Add 5 minute buffer before actual expiration
  const EXPIRY_BUFFER_MS = 5 * 60 * 1000;
  return new Date().getTime() > expiresAt.getTime() - EXPIRY_BUFFER_MS;
}
