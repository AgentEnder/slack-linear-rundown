/**
 * Authentication Routes
 * Handles Sign in with Slack OAuth flow and JWT token management
 */

import { Router, Request, Response } from 'express';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  verifyAndDecodeIdToken,
  generateOAuthState,
  generateTokenPair,
  verifyToken,
  type OAuthConfig,
  type OAuthState,
  buildGitHubAuthorizationUrl,
  exchangeGitHubCodeForToken,
  fetchGitHubUserInfo,
  generateGitHubOAuthState,
  type GitHubOAuthConfig,
  type GitHubOAuthState,
  encrypt,
} from '@slack-linear-rundown/auth';
import { User, EncryptedConfigService } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger';

const router = Router();

// In-memory store for OAuth states (in production, use Redis or database)
const oauthStates = new Map<string, OAuthState>();
const githubOAuthStates = new Map<string, GitHubOAuthState>();

// Clean up expired states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const FIFTEEN_MINUTES = 15 * 60 * 1000;

  // Clean up Slack OAuth states
  for (const [state, data] of oauthStates.entries()) {
    // Add timestamp to state data structure
    const stateData = data as OAuthState & { timestamp?: number };
    if (stateData.timestamp && now - stateData.timestamp > FIFTEEN_MINUTES) {
      oauthStates.delete(state);
    }
  }

  // Clean up GitHub OAuth states
  for (const [state, data] of githubOAuthStates.entries()) {
    const stateData = data as GitHubOAuthState & { timestamp?: number };
    if (stateData.timestamp && now - stateData.timestamp > FIFTEEN_MINUTES) {
      githubOAuthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /auth/slack
 * Initiate OAuth flow - redirect user to Slack
 */
router.get('/slack', (req: Request, res: Response) => {
  try {
    const redirectTo = (req.query.redirect as string) || undefined;
    const oauthState = generateOAuthState(redirectTo);

    // Store state with timestamp for cleanup
    oauthStates.set(oauthState.state, {
      ...oauthState,
      timestamp: Date.now(),
    } as any);

    const oauthConfig: OAuthConfig = {
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      redirectUri: process.env.SLACK_OAUTH_REDIRECT_URI || `${process.env.API_URL}/auth/slack/callback`,
    };

    const authUrl = buildAuthorizationUrl(
      oauthConfig,
      oauthState.state,
      oauthState.nonce
    );

    logger.info('Redirecting to Slack OAuth', { redirectTo });
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate OAuth flow', { error });
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

/**
 * GET /auth/slack/callback
 * OAuth callback - exchange code for tokens, create user session
 */
router.get('/slack/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      logger.error('Missing code or state in OAuth callback');
      return res.status(400).json({ error: 'Invalid OAuth callback' });
    }

    // Verify state to prevent CSRF
    const storedState = oauthStates.get(state as string);
    if (!storedState) {
      logger.error('Invalid or expired OAuth state', { state });
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Remove used state
    oauthStates.delete(state as string);

    const oauthConfig: OAuthConfig = {
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      redirectUri: process.env.SLACK_OAUTH_REDIRECT_URI || `${process.env.API_URL}/auth/slack/callback`,
    };

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string, oauthConfig);

    // Verify and decode ID token (includes signature verification and nonce check)
    const idToken = await verifyAndDecodeIdToken(
      tokens.id_token,
      oauthConfig.clientId,
      storedState.nonce
    );

    // Find or create user
    const slackUserId = idToken['https://slack.com/user_id'];
    const teamId = idToken['https://slack.com/team_id'];
    const email = idToken.email;

    let user = await User.findOne({
      where: { slack_user_id: slackUserId },
    });

    if (!user && email) {
      // Try to find by email
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      // Create new user
      user = await User.create({
        slack_user_id: slackUserId,
        email: email || `${slackUserId}@slack.local`,
        slack_real_name: idToken.name,
        is_active: true,
      });
      logger.info('Created new user from OAuth', { userId: user.id, slackUserId });
    } else {
      // Update existing user
      user.slack_user_id = slackUserId;
      if (idToken.name) user.slack_real_name = idToken.name;
      user.is_active = true;
      await user.save();
      logger.info('Updated existing user from OAuth', { userId: user.id, slackUserId });
    }

    // Generate JWT tokens
    const jwtTokens = generateTokenPair(
      {
        userId: user.id!,
        slackUserId,
        email: user.email,
        name: user.slack_real_name || undefined,
        teamId,
      },
      process.env.JWT_SECRET!
    );

    // Set httpOnly cookie with access token
    res.cookie('accessToken', jwtTokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Set httpOnly cookie with refresh token
    res.cookie('refreshToken', jwtTokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to original destination or default
    const redirectTo = storedState.redirectTo || '/';
    logger.info('OAuth successful, redirecting user', { userId: user.id, redirectTo });
    return res.redirect(redirectTo);
  } catch (error) {
    logger.error('OAuth callback failed', { error });
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken, process.env.JWT_SECRET!);

    // Generate new access token
    const newAccessToken = generateTokenPair(
      {
        userId: payload.userId,
        slackUserId: payload.slackUserId,
        email: payload.email,
        name: payload.name,
        teamId: payload.teamId,
      },
      process.env.JWT_SECRET!
    ).accessToken;

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Token refresh failed', { error });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * POST /auth/logout
 * Clear authentication cookies
 */
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

/**
 * GET /auth/github
 * Initiate GitHub OAuth flow - redirect user to GitHub
 * Requires authenticated user (JWT cookie)
 */
router.get('/github', (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated. Please sign in with Slack first.' });
    }

    const redirectTo = (req.query.redirect as string) || undefined;
    const githubOAuthState = generateGitHubOAuthState(redirectTo);

    // Store state with timestamp for cleanup
    githubOAuthStates.set(githubOAuthState.state, {
      ...githubOAuthState,
      timestamp: Date.now(),
    } as any);

    const githubOAuthConfig: GitHubOAuthConfig = {
      clientId: process.env.GITHUB_APP_CLIENT_ID!,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
      redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI || `${process.env.API_URL}/auth/github/callback`,
    };

    const authUrl = buildGitHubAuthorizationUrl(
      githubOAuthConfig,
      githubOAuthState.state
    );

    logger.info('Redirecting to GitHub OAuth', { redirectTo });
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate GitHub OAuth flow', { error });
    res.status(500).json({ error: 'Failed to initiate GitHub authentication' });
  }
});

/**
 * GET /auth/github/callback
 * GitHub OAuth callback - exchange code for tokens, save to user
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      logger.error('Missing code or state in GitHub OAuth callback');
      return res.status(400).json({ error: 'Invalid GitHub OAuth callback' });
    }

    // Verify state to prevent CSRF
    const storedState = githubOAuthStates.get(state as string);
    if (!storedState) {
      logger.error('Invalid or expired GitHub OAuth state', { state });
      return res.status(400).json({ error: 'Invalid or expired state' });
    }

    // Remove used state
    githubOAuthStates.delete(state as string);

    // Verify user is authenticated (must be signed in with Slack first)
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated. Please sign in with Slack first.' });
    }

    const jwtPayload = verifyToken(accessToken, process.env.JWT_SECRET!);
    const user = await User.findByPk(jwtPayload.userId);

    if (!user) {
      logger.error('User not found for GitHub OAuth', { userId: jwtPayload.userId });
      return res.status(404).json({ error: 'User not found' });
    }

    const githubOAuthConfig: GitHubOAuthConfig = {
      clientId: process.env.GITHUB_APP_CLIENT_ID!,
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET!,
      redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI || `${process.env.API_URL}/auth/github/callback`,
    };

    // Exchange code for tokens
    const tokens = await exchangeGitHubCodeForToken(code as string, githubOAuthConfig);

    // Fetch GitHub user info
    const githubUser = await fetchGitHubUserInfo(tokens.access_token);

    // Calculate token expiration (if provided)
    let tokenExpiresAt: Date | null = null;
    if (tokens.expires_in) {
      tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    }

    // Encrypt and save tokens to user record
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      logger.error('ENCRYPTION_KEY not configured - cannot store GitHub tokens');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    user.github_access_token = encrypt(tokens.access_token, encryptionKey);
    if (tokens.refresh_token) {
      user.github_refresh_token = encrypt(tokens.refresh_token, encryptionKey);
    }
    user.github_token_expires_at = tokenExpiresAt;
    user.github_username = githubUser.login;
    user.github_user_id = String(githubUser.id);
    user.github_scopes = tokens.scope;

    // Set connected_at timestamp if this is first connection
    if (!user.github_connected_at) {
      user.github_connected_at = new Date();
    }

    await user.save();

    logger.info('GitHub OAuth successful', {
      userId: user.id,
      githubUsername: githubUser.login,
      githubUserId: githubUser.id,
    });

    // Redirect to original destination or user settings
    const redirectTo = storedState.redirectTo || '/user/settings';
    return res.redirect(redirectTo);
  } catch (error) {
    logger.error('GitHub OAuth callback failed', { error });
    return res.status(500).json({ error: 'GitHub authentication failed' });
  }
});

/**
 * GET /auth/me
 * Get current user info from JWT token
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = verifyToken(accessToken, process.env.JWT_SECRET!);
    return res.json({
      userId: payload.userId,
      slackUserId: payload.slackUserId,
      email: payload.email,
      name: payload.name,
      teamId: payload.teamId,
    });
  } catch (error) {
    logger.error('Failed to get user info', { error });
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as authRouter };
