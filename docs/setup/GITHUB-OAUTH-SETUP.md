# GitHub OAuth Integration Setup

This guide will walk you through setting up GitHub OAuth for user-specific GitHub connections in the Slack-Linear Rundown application.

## Table of Contents
- [Overview](#overview)
- [Creating a GitHub App](#creating-a-github-app)
- [Configuring Your Application](#configuring-your-application)
- [User Flow](#user-flow)
- [Troubleshooting](#troubleshooting)

---

## Overview

The application supports two modes of GitHub integration:

1. **User-Specific OAuth (Recommended)**: Each user connects their own GitHub account
   - Better rate limits (5000 req/hour per user)
   - Secure per-user tokens
   - Automatic token refresh
   - No manual username mapping required

2. **Shared Token (Fallback)**: Single GitHub token used for all users
   - Simpler setup
   - Lower rate limits
   - Requires manual username mapping

This guide covers setting up **User-Specific OAuth** via a GitHub App.

---

## Creating a GitHub App

### Step 1: Register a New GitHub App

1. Go to **GitHub Settings** → **Developer settings** → **GitHub Apps**
2. Click **"New GitHub App"**

### Step 2: Configure Basic Information

**GitHub App Name:**
```
Slack Linear Rundown (Your Org/Personal)
```

**Homepage URL:**
```
https://your-domain.com
```

**Callback URL (Important!):**
```
https://your-domain.com/auth/github/callback
```

For local development:
```
https://localhost/auth/github/callback
```

### Step 3: Configure Permissions

**Repository Permissions:**
- **Contents**: Read-only
- **Pull requests**: Read-only
- **Issues**: Read-only
- **Metadata**: Read-only (automatically added)

**Account Permissions:**
- **Email addresses**: Read-only

### Step 4: Configure User Permissions

Enable **"Request user authorization (OAuth) during installation"**

**User permissions:**
- **Email addresses**: Read-only

### Step 5: Subscribe to Events (Optional)

You don't need webhook events for this integration, but you can enable them if you want real-time updates in the future.

### Step 6: Where can this GitHub App be installed?

Choose based on your needs:
- **Any account** - Public app (anyone can install)
- **Only on this account** - Private app (recommended for organizations)

### Step 7: Create the App

Click **"Create GitHub App"**

---

## Configuring Your Application

After creating the GitHub App, you'll need to configure your Slack-Linear Rundown application.

### Get Your GitHub App Credentials

1. On your GitHub App page, find:
   - **Client ID** (visible on the main page)
   - **Client Secret** (click "Generate a new client secret")

2. Copy both values

### Add to Environment Variables

Add to your `.env` file:

```bash
# GitHub OAuth Configuration
GITHUB_APP_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_APP_CLIENT_SECRET=your_client_secret_here
GITHUB_OAUTH_REDIRECT_URI=https://localhost/auth/github/callback

# Encryption key (required for storing OAuth tokens)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Optional: Fallback shared GitHub token
GITHUB_TOKEN=ghp_your_personal_access_token_here
```

### Generate an Encryption Key

The encryption key is used to securely store user GitHub tokens in the database.

```bash
# Generate a secure 32-character key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Run Database Migrations

The GitHub OAuth integration requires new database tables:

```bash
pnpm nx run database:migrate
```

This will run migration `007-add-github-oauth-tokens.ts` which adds token storage fields to the User table.

### Restart Your Application

```bash
pnpm dev
```

---

## User Flow

Once configured, users can connect their GitHub accounts:

### 1. Sign In with Slack

Users must first be authenticated via Slack OAuth:
```
https://your-domain.com/user
```

### 2. Connect GitHub Account

From the user app settings page:
```
https://your-domain.com/user/settings
```

Click **"Connect GitHub"** → redirected to GitHub → authorize app → redirected back

### 3. GitHub Data in Reports

After connecting:
- Weekly reports automatically include GitHub activity
- PRs merged, issues closed, code reviews given
- Correlates GitHub work with Linear issues
- Data refreshes automatically (tokens refresh before expiration)

### 4. Check Connection Status

API endpoint:
```bash
curl https://your-domain.com/api/user/github/status \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN"
```

Response:
```json
{
  "connected": true,
  "username": "octocat",
  "userId": "12345",
  "connectedAt": "2025-10-28T12:00:00Z",
  "scopes": ["repo", "read:user", "user:email"],
  "tokenValid": true,
  "tokenExpiresAt": "2025-11-28T12:00:00Z"
}
```

### 5. Disconnect GitHub

```bash
curl -X POST https://your-domain.com/api/user/github/disconnect \
  -H "Cookie: accessToken=YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### "Invalid or expired state" Error

**Cause:** OAuth state mismatch (possible CSRF attempt or expired session)

**Solutions:**
- Try connecting again
- Clear browser cookies
- Check that your redirect URI matches exactly

### "ENCRYPTION_KEY not configured"

**Cause:** Missing encryption key in environment variables

**Solution:**
```bash
# Add to .env
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### GitHub Token Expired

**What happens:**
- System automatically attempts to refresh token
- If refresh fails, user is disconnected (need to reconnect)
- Logs show: "GitHub token expired, attempting refresh"

**Solution:**
User needs to reconnect their GitHub account via user settings.

### No GitHub Data in Reports

**Checklist:**
1. ✅ User has connected GitHub account
2. ✅ User has recent GitHub activity (last 30 days)
3. ✅ GitHub username is populated in database
4. ✅ `ENCRYPTION_KEY` is configured
5. ✅ Migration 007 has been run

**Check logs:**
```bash
# Look for these messages
"GitHub client initialized for user X"
"Fetching GitHub data for user Y"
"GitHub activity for user Y"
```

### Rate Limiting

Even with user-specific tokens, GitHub rate limits apply (5000 req/hour per user).

**Check rate limit:**
```bash
curl -H "Authorization: token USER_GITHUB_TOKEN" \
  https://api.github.com/rate_limit
```

**If hitting rate limits:**
- Reduce report frequency
- Implement caching (already done for reports)
- Use webhook events instead of polling (future enhancement)

### Token Refresh Failed

**Logs show:** "Failed to refresh GitHub token"

**Causes:**
- GitHub App credentials changed
- User revoked access
- Network issues

**Solution:**
User will be automatically disconnected and need to reconnect via settings.

---

## Security Considerations

### Token Storage

- Tokens are encrypted at rest using AES-256-CBC
- Encryption key stored in environment (not in database)
- Tokens are decrypted only when needed for API calls
- Tokens never exposed in logs or API responses

### Token Refresh

- Tokens automatically refresh before expiration
- Refresh uses GitHub's token refresh endpoint
- Old tokens are securely overwritten
- Failed refresh logs error and disconnects user

### OAuth State

- CSRF protection via state parameter
- State stored in-memory with 15-minute expiration
- State validated on callback
- Automatic cleanup of expired states

---

## Fallback: Shared GitHub Token

If you prefer not to use OAuth, you can configure a shared GitHub Personal Access Token:

### Create Personal Access Token

1. GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `repo`, `read:user`, `user:email`
4. Copy token

### Configure

Add to `.env`:
```bash
GITHUB_TOKEN=ghp_your_personal_access_token_here
```

### Limitations

- Shared rate limit across all users (5000 req/hour total)
- Requires manual username mapping in database
- Less secure (single point of failure)
- No automatic refresh

---

## Next Steps

After setup:

1. **Test the OAuth flow** (see test section below)
2. **Build user app UI** for GitHub connection
3. **Monitor logs** for successful connections
4. **Update user documentation** with instructions

---

## Testing OAuth Flow

### Manual Test

1. Sign in with Slack: `https://localhost/user`
2. Navigate to: `https://localhost/auth/github?redirect=/user/settings`
3. Authorize on GitHub
4. Verify redirect back to app
5. Check database: `SELECT * FROM User WHERE id = YOUR_USER_ID;`
   - `github_access_token` should be populated (encrypted)
   - `github_username` should match your GitHub username
   - `github_connected_at` should have timestamp

### API Test

```bash
# Check connection status
curl https://localhost/api/user/github/status \
  -H "Cookie: accessToken=YOUR_JWT" \
  -k

# Generate report
curl -X POST https://localhost/api/preview-report \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}' \
  -k

# Check for GitHub data in logs
tail -f logs/combined.log | grep "GitHub"
```

### Expected Log Output

```
[info] GitHub client initialized for user 1
[info] Fetching GitHub data for user octocat
[info] GitHub activity for user octocat { completedPRs: 3, activePRs: 2, ... }
[info] Synced GitHub data to database for user 1
[info] Correlated GitHub work with Linear issues for user 1
```

---

## Support

If you encounter issues:

1. Check logs: `tail -f logs/combined.log`
2. Verify environment variables are loaded
3. Confirm database migrations ran successfully
4. Test GitHub App credentials manually
5. Open an issue with logs and configuration (sanitize sensitive data)

---

**Status:** Ready for production use
**Last Updated:** 2025-10-28
