/**
 * JWT Token Management
 * Utilities for creating and validating JWT tokens
 */

import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: number;
  slackUserId: string;
  email: string;
  name?: string;
  teamId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate a JWT access token
 * Short-lived token for API authentication (1 hour)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): string {
  return jwt.sign(payload, secret, {
    expiresIn: '1h',
    issuer: 'slack-linear-rundown',
  });
}

/**
 * Generate a JWT refresh token
 * Long-lived token for renewing access tokens (7 days)
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): string {
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: 'slack-linear-rundown',
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): TokenPair {
  return {
    accessToken: generateAccessToken(payload, secret),
    refreshToken: generateRefreshToken(payload, secret),
  };
}

/**
 * Verify and decode a JWT token
 * Throws error if token is invalid or expired
 */
export function verifyToken(token: string, secret: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'slack-linear-rundown',
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Decode a JWT token without verifying
 * Use for inspecting token contents, not for authentication
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
