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

// OAuth utilities (Slack)
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

// OAuth utilities (GitHub)
export {
  generateGitHubOAuthState,
  buildGitHubAuthorizationUrl,
  exchangeGitHubCodeForToken,
  fetchGitHubUserInfo,
  refreshGitHubToken,
  isGitHubTokenExpired,
  type GitHubOAuthConfig,
  type GitHubOAuthState,
} from './lib/github-oauth.js';

// Encryption utilities
export {
  encrypt,
  decrypt,
} from './lib/encryption.js';
