# OAuth Setup Guide

This guide walks you through setting up Sign in with Slack authentication for the Slack-Linear Rundown application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [HTTPS Setup for Local Development](#https-setup-for-local-development)
3. [Slack App Configuration](#slack-app-configuration)
4. [Generate Security Secrets](#generate-security-secrets)
5. [Environment Variables](#environment-variables)
6. [Local Development Setup](#local-development-setup)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Slack workspace where you have permission to create apps
- Access to your Slack-Linear Rundown repository
- Node.js installed (for generating secrets)
- OpenSSL installed (usually pre-installed on macOS/Linux)

---

## HTTPS Setup for Local Development

⚠️ **Important:** Slack requires HTTPS for OAuth callbacks, even in local development. HTTP callbacks are not supported.

### Why HTTPS is Required

Slack's OAuth implementation requires secure (HTTPS) redirect URIs for security reasons. The OAuth callback will not work without HTTPS.

### Caddy Reverse Proxy (Recommended)

We use **Caddy** to handle HTTPS locally with automatic locally-trusted certificates - **no browser warnings!**

**Quick Setup:**

```bash
# 1. Install Caddy (one-time setup)
brew install caddy  # macOS
# For Linux/Windows, see LOCAL-HTTPS-SETUP.md

# 2. Install Caddy's local CA (one-time setup)
caddy trust
```

That's it! When you run `pnpm dev`, Caddy automatically:
- Generates and trusts SSL certificates
- Provides HTTPS on `https://localhost` (port 443)
- Redirects HTTP to HTTPS automatically
- Routes requests to your API and frontend dev servers

**📖 Full Documentation:** See [LOCAL-HTTPS-SETUP.md](./LOCAL-HTTPS-SETUP.md) for complete setup instructions, troubleshooting, and advanced configuration.

### Production Note

In production, use a reverse proxy (Caddy, nginx, Traefik, or your cloud provider's load balancer) to handle SSL termination. The application will run on HTTP behind the proxy, and the proxy will handle HTTPS for external traffic.

---

## Slack App Configuration

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter an app name (e.g., "Slack-Linear Rundown")
5. Select your workspace
6. Click **"Create App"**

### Step 2: Configure OAuth & Permissions

1. In your app settings, go to **"OAuth & Permissions"** in the left sidebar

2. Scroll to **"Redirect URLs"** and add:
   - For local development: `https://localhost/auth/slack/callback`
   - For production: `https://your-domain.com/auth/slack/callback`

   Click **"Add"** then **"Save URLs"**

   ⚠️ **Note:** You must use `https://` (not `http://`) for the callback URL. For local development, use `https://localhost` (no port number - Caddy uses standard port 443).

3. Scroll to **"Scopes"** section

4. Under **"User Token Scopes"** (NOT Bot Token Scopes), add:
   - `openid` - Required for Sign in with Slack
   - `email` - Get user's email address
   - `profile` - Get user's profile information (name, avatar)

5. Under **"Bot Token Scopes"**, ensure you have:
   - `chat:write` - Send messages as the bot
   - `users:read` - Read user information
   - `users:read.email` - Read user email addresses
   - (Any other scopes your app needs)

6. Click **"Save Changes"**

### Step 3: Get Your Client ID and Secret

1. Go to **"Basic Information"** in the left sidebar

2. Scroll to **"App Credentials"**

3. Copy the following values (you'll need these for environment variables):
   - **Client ID** - This is your `SLACK_CLIENT_ID`
   - **Client Secret** - Click "Show" then copy - This is your `SLACK_CLIENT_SECRET`
   - **Signing Secret** - This is your `SLACK_SIGNING_SECRET`

⚠️ **Important:** Keep your Client Secret and Signing Secret secure! Never commit them to version control.

### Step 4: Install the App (If Using Bot Features)

1. Go to **"Install App"** in the left sidebar
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **"Bot User OAuth Token"** - This is your `SLACK_BOT_TOKEN`

---

## Generate Security Secrets

### JWT Secret

Generate a secure random string for signing JWT tokens:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hex string. Use this as your `JWT_SECRET`.

### Encryption Key (Optional)

If you plan to use the admin interface's encrypted configuration storage:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use this as your `ENCRYPTION_KEY`.

---

## Environment Variables

### Required Variables

Add these to your `.env.local` file (create it from `.env.example`):

```bash
# Slack OAuth Configuration
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=your-client-secret-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_BOT_TOKEN=xoxb-your-bot-token-here

# Linear Configuration
LINEAR_API_KEY=lin_api_your-linear-api-key-here

# Security
JWT_SECRET=your-64-character-hex-string-here

# API Configuration (HTTPS required for OAuth)
# Caddy serves on https://localhost (standard port 443)
API_URL=https://localhost
SLACK_OAUTH_REDIRECT_URI=https://localhost/auth/slack/callback

# Optional
ENCRYPTION_KEY=your-64-character-hex-string-here
```

### Variable Reference

| Variable | Required | Description | How to Get It |
|----------|----------|-------------|---------------|
| `SLACK_CLIENT_ID` | ✅ Yes | OAuth Client ID | Slack App > Basic Information > App Credentials |
| `SLACK_CLIENT_SECRET` | ✅ Yes | OAuth Client Secret | Slack App > Basic Information > App Credentials (click "Show") |
| `SLACK_SIGNING_SECRET` | ✅ Yes | For verifying Slack requests | Slack App > Basic Information > App Credentials |
| `SLACK_BOT_TOKEN` | ✅ Yes | Bot user OAuth token | Slack App > OAuth & Permissions > Bot User OAuth Token |
| `LINEAR_API_KEY` | ✅ Yes | Linear API key | https://linear.app/settings/api |
| `JWT_SECRET` | ✅ Yes | For signing JWT tokens (min 32 chars) | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `API_URL` | ✅ Yes | Base URL for API (use HTTPS for OAuth) | Your API server URL (e.g., `https://localhost`) |
| `SLACK_OAUTH_REDIRECT_URI` | No | OAuth redirect (defaults to API_URL/auth/slack/callback) | Must match Slack app config exactly |
| `ENCRYPTION_KEY` | No | For admin config encryption | Generate with same command as JWT_SECRET |

---

## Local Development Setup

### 1. Install and Configure Caddy

⚠️ **Required:** Install Caddy for HTTPS support:

```bash
# Install Caddy
brew install caddy  # macOS
# For Linux/Windows, see LOCAL-HTTPS-SETUP.md

# Install Caddy's local CA (one-time setup)
caddy trust
```

See [LOCAL-HTTPS-SETUP.md](./LOCAL-HTTPS-SETUP.md) for complete setup instructions.

### 2. Copy Environment Template

```bash
cp .env.example .env.local
```

### 3. Fill in Your Values

Edit `.env.local` with your Slack credentials and generated secrets:

```bash
# Required
SLACK_CLIENT_ID=<your-client-id>
SLACK_CLIENT_SECRET=<your-client-secret>
SLACK_SIGNING_SECRET=<your-signing-secret>
SLACK_BOT_TOKEN=<your-bot-token>
LINEAR_API_KEY=<your-linear-api-key>
JWT_SECRET=<generated-64-char-hex>

# HTTPS Configuration (Required for OAuth)
# Caddy serves on https://localhost (standard port 443)
API_URL=https://localhost
SLACK_OAUTH_REDIRECT_URI=https://localhost/auth/slack/callback

# Other defaults
DATABASE_PATH=./data/rundown.db
NODE_ENV=development
PORT=3000
```

### 4. Start the Application

```bash
pnpm install
pnpm dev
```

The server will start with HTTPS at `https://localhost:3000`.

### 5. Test OAuth Flow

1. Open **https://localhost:3000/admin** or **https://localhost:3000/user** (note the HTTPS)
2. Accept the browser security warning (self-signed certificate)
3. You should see a "Sign in with Slack" button
4. Click it to initiate OAuth flow
5. Authorize the app in Slack
6. You should be redirected back and authenticated

---

## Production Deployment

### 1. Update Slack App Redirect URLs

1. Go to your Slack app settings: https://api.slack.com/apps
2. Navigate to **OAuth & Permissions**
3. Add your production redirect URL: `https://your-domain.com/auth/slack/callback`
4. Click **Save URLs**

### 2. Set Environment Variables

In your production environment (Docker, Kubernetes, hosting platform), set:

```bash
# Slack (same as development)
SLACK_CLIENT_ID=<your-client-id>
SLACK_CLIENT_SECRET=<your-client-secret>
SLACK_SIGNING_SECRET=<your-signing-secret>
SLACK_BOT_TOKEN=<your-bot-token>

# Linear
LINEAR_API_KEY=<your-linear-api-key>

# Security
JWT_SECRET=<generated-64-char-hex>

# Production URLs
API_URL=https://your-domain.com
SLACK_OAUTH_REDIRECT_URI=https://your-domain.com/auth/slack/callback
NODE_ENV=production
```

### 3. Security Checklist

- [ ] All secrets stored in secure secret management (not in code)
- [ ] HTTPS enabled on production domain
- [ ] Cookies configured with `secure: true` (automatic in production)
- [ ] JWT_SECRET is different from development
- [ ] Redirect URIs match exactly (including protocol and trailing slashes)
- [ ] CORS configured if frontend and backend on different domains

---

## Troubleshooting

### Caddy/HTTPS Issues

**Problem:** "caddy: command not found"

**Solution:**
```bash
# macOS
brew install caddy

# Linux - see LOCAL-HTTPS-SETUP.md

# Verify
caddy version
```

**Problem:** Browser shows certificate error even with Caddy

**Solution:**
```bash
# Reinstall Caddy's local CA
caddy untrust
caddy trust

# Restart browser
```

**Problem:** "Permission denied" when starting Caddy

**Solution:** Caddy needs permission to bind to port 443. Either:
1. Run with sudo: `sudo pnpm dev`
2. Use a non-privileged port (see LOCAL-HTTPS-SETUP.md)
3. Grant permissions: `sudo setcap cap_net_bind_service=+ep $(which caddy)`

### "Invalid redirect_uri" Error

**Problem:** Slack returns an error about invalid redirect URI

**Solutions:**
1. Ensure redirect URI in Slack app settings matches EXACTLY:
   - Protocol (**must be https**, even for localhost)
   - Domain (localhost)
   - **No port number** (Caddy uses standard port 443)
   - Path (/auth/slack/callback)
2. Verify you're using HTTPS: `https://localhost/auth/slack/callback`
3. Check `SLACK_OAUTH_REDIRECT_URI` environment variable matches Slack config
4. Ensure `API_URL=https://localhost` in `.env.local`
5. Ensure Caddy is running (you should see it in `pnpm dev` output)
6. No trailing slashes in URLs

### "Invalid client credentials" Error

**Problem:** Token exchange fails with authentication error

**Solutions:**
1. Verify `SLACK_CLIENT_ID` matches app's Client ID
2. Verify `SLACK_CLIENT_SECRET` is correct (click "Show" in Slack app settings)
3. Regenerate Client Secret if you think it's compromised

### "JWT_SECRET must be at least 32 characters"

**Problem:** Application won't start

**Solution:**
Generate a proper JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
This creates a 64-character hex string (32 bytes).

### User Not Found After OAuth

**Problem:** OAuth succeeds but user isn't found/created

**Solutions:**
1. Check database migrations have run: `npx nx run @slack-linear-rundown/api:migrate`
2. Verify database is writable
3. Check API logs for errors during user creation
4. Ensure `email` scope is included in OAuth flow

### Cookies Not Being Set

**Problem:** Authentication succeeds but user not logged in

**Solutions:**
1. Check browser console for cookie warnings
2. Verify `sameSite: 'lax'` is appropriate for your setup
3. In development with different ports, ensure `CORS` is configured
4. Check that `credentials: 'include'` is set in fetch requests

### ID Token Verification Failed

**Problem:** "ID token verification failed" error

**Solutions:**
1. Check that Slack's JWKS endpoint is accessible: https://slack.com/openid/connect/keys
2. Verify nonce is being stored and validated correctly
3. Ensure system time is accurate (JWT expiration is time-sensitive)
4. Check that `clientId` passed to verification matches your app's Client ID

---

## Additional Resources

- [Slack Sign in with Slack Documentation](https://api.slack.com/authentication/sign-in-with-slack)
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [OpenID Connect Specification](https://openid.net/connect/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Regenerate JWT_SECRET periodically
   - If Client Secret is compromised, regenerate in Slack app settings

2. **Monitor Access Logs**
   - Check for suspicious authentication attempts
   - Alert on multiple failed login attempts

3. **Use HTTPS in Production**
   - Never send credentials over unencrypted connections
   - Cookies with `secure: true` flag in production

4. **Validate All Inputs**
   - The application validates nonce, issuer, and audience
   - Additional custom validation can be added to auth routes

5. **Keep Dependencies Updated**
   - Run `pnpm update` regularly
   - Monitor for security advisories on `jsonwebtoken`, `jose`, etc.

6. **Implement Rate Limiting**
   - Prevent brute force attacks on auth endpoints
   - Consider adding rate limiting middleware to `/auth/*` routes

---

**Last Updated:** January 2025
**Version:** 1.0.0
