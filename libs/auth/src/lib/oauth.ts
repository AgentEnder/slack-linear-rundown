/**
 * Slack OAuth Utilities
 * Helpers for Sign in with Slack OAuth flow
 */

import crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthState {
  state: string;
  nonce: string;
  redirectTo?: string;
}

/**
 * Generate a secure random string for state/nonce
 */
export function generateSecureRandom(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate OAuth state and nonce
 */
export function generateOAuthState(redirectTo?: string): OAuthState {
  return {
    state: generateSecureRandom(),
    nonce: generateSecureRandom(),
    redirectTo,
  };
}

/**
 * Build Slack OAuth authorization URL
 * @param config OAuth configuration
 * @param state CSRF protection state
 * @param nonce Token forgery prevention nonce
 * @returns Authorization URL to redirect user to
 */
export function buildAuthorizationUrl(
  config: OAuthConfig,
  state: string,
  nonce: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'openid email profile',
    client_id: config.clientId,
    state,
    nonce,
    redirect_uri: config.redirectUri,
  });

  return `https://slack.com/openid/connect/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  config: OAuthConfig
): Promise<{
  access_token: string;
  id_token: string;
  token_type: string;
}> {
  const response = await fetch('https://slack.com/api/openid.connect.token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  const data = await response.json() as any;

  if (!data.ok) {
    throw new Error(`Token exchange failed: ${data.error}`);
  }

  return {
    access_token: data.access_token as string,
    id_token: data.id_token as string,
    token_type: data.token_type as string,
  };
}

/**
 * Verify and decode Slack ID token
 * Uses jose to verify the JWT signature against Slack's public keys
 */
export interface SlackIdToken {
  sub: string; // Slack user ID
  email?: string;
  name?: string;
  picture?: string;
  'https://slack.com/team_id': string;
  'https://slack.com/user_id': string;
  nonce: string;
  iss: string; // Issuer
  aud: string; // Audience (client ID)
  exp: number; // Expiry
  iat: number; // Issued at
}

export async function verifyAndDecodeIdToken(
  idToken: string,
  clientId: string,
  expectedNonce: string
): Promise<SlackIdToken> {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');

  // Slack's JWKS endpoint for public keys
  const JWKS = createRemoteJWKSet(new URL('https://slack.com/openid/connect/keys'));

  try {
    // Verify the token signature and claims
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: 'https://slack.com',
      audience: clientId,
    });

    // Verify nonce
    if (payload.nonce !== expectedNonce) {
      throw new Error('Nonce mismatch - possible token replay attack');
    }

    return payload as unknown as SlackIdToken;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ID token verification failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Decode ID token without verification (for debugging only)
 * @deprecated Use verifyAndDecodeIdToken for production
 */
export function decodeIdTokenUnsafe(idToken: string): SlackIdToken {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload) as SlackIdToken;
}

/**
 * Fetch user info from Slack
 */
export async function fetchUserInfo(accessToken: string): Promise<{
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  'https://slack.com/team_id': string;
  'https://slack.com/user_id': string;
}> {
  const response = await fetch('https://slack.com/api/openid.connect.userInfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  const data = await response.json() as any;

  if (!data.ok) {
    throw new Error(`Failed to fetch user info: ${data.error}`);
  }

  return data as {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    'https://slack.com/team_id': string;
    'https://slack.com/user_id': string;
  };
}
