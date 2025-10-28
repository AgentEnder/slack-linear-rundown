/**
 * Authentication Library
 * Shared authentication utilities for Slack-Linear Rundown
 */

// JWT utilities
export {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  decodeToken,
  type JWTPayload,
  type TokenPair,
} from './lib/jwt.js';

// OAuth utilities
export {
  generateSecureRandom,
  generateOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  verifyAndDecodeIdToken,
  decodeIdTokenUnsafe,
  fetchUserInfo,
  type OAuthConfig,
  type OAuthState,
  type SlackIdToken,
} from './lib/oauth.js';
