# Local HTTPS Setup with Caddy

This guide explains how to set up HTTPS for local development using Caddy reverse proxy.

## Why HTTPS for Local Development?

**Slack requires HTTPS for OAuth callbacks**, even in local development. HTTP OAuth redirect URIs are not supported by Slack's security policy. This means you must run with HTTPS enabled to test the "Sign in with Slack" authentication flow locally.

## Why Caddy?

[Caddy](https://caddyserver.com/) is a modern web server that:

- **Automatic HTTPS** - Generates and installs locally-trusted certificates automatically
- **Zero configuration** - Works out of the box with sensible defaults
- **Reverse proxy** - Routes requests to your API and frontend dev servers
- **HTTP/2 and HTTP/3** - Modern protocols supported automatically
- **No browser warnings** - Certificates are signed by Caddy's local CA

## Quick Start

### 1. Install Caddy

**macOS (Homebrew):**

```bash
brew install caddy
```

**Linux (Debian/Ubuntu):**

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Windows (Scoop):**

```powershell
scoop install caddy
```

**Or download directly:** https://caddyserver.com/download

### 2. Install Local CA Certificates

Caddy needs to install its local CA certificate in your system trust store (one-time setup):

```bash
caddy trust
```

This command will:

- Generate a local Certificate Authority (CA)
- Install it in your system's trust store
- May require sudo/administrator password

After this, Caddy-generated certificates will be trusted by your browser with no security warnings.

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

The defaults are already configured for Caddy:

```bash
# API runs on port 3001 (Caddy proxies to it)
PORT=3001

# Caddy serves on https://localhost (standard port 443)
API_URL=https://localhost
```

### 4. Update Slack App Configuration

In your Slack app settings (https://api.slack.com/apps):

1. Go to **OAuth & Permissions**
2. Under **Redirect URLs**, add:
   ```
   https://localhost/auth/slack/callback
   ```
3. Click **Save URLs**

⚠️ **Note:** Use `https://localhost` (no port number - Caddy uses standard port 443)

### 5. Start All Services

Use the Nx "dev" target to start everything at once:

```bash
pnpm dev
```

Or run manually:

```bash
npx nx serve dev
```

This starts:

- **API server** on `http://localhost:3001`
- **Admin Vite dev server** on `http://localhost:4200`
- **User Vite dev server** on `http://localhost:4201`
- **Caddy reverse proxy** on `https://localhost` (port 443)

### 6. Access the Application

Open your browser to:

- **Admin UI:** https://localhost/admin
- **User UI:** https://localhost/user
- **API:** https://localhost/api/health

**No security warnings!** Caddy's certificates are automatically trusted.

## How It Works

### Architecture

```
Browser (https://localhost)
         ↓
    Caddy Reverse Proxy (port 443)
         ↓
    ┌────┴────┬────────────┬───────────┐
    ↓         ↓            ↓           ↓
/api/*    /admin/*     /user/*      /auth/*
    ↓         ↓            ↓           ↓
API:3001  Admin:4200  User:4201   API:3001
```

### Caddyfile Configuration

The `Caddyfile` in the project root defines the routing:

```caddyfile
localhost {
    # API routes
    handle /api/* {
        reverse_proxy localhost:3001
    }

    # OAuth routes
    handle /auth/* {
        reverse_proxy localhost:3001
    }

    # Admin UI (with WebSocket support for HMR)
    handle /admin/* {
        reverse_proxy localhost:4200
    }

    # User UI (with WebSocket support for HMR)
    handle /user/* {
        reverse_proxy localhost:4201
    }
}
```

### Service Ports

| Service    | Port        | Access Via                       |
| ---------- | ----------- | -------------------------------- |
| Caddy      | 443 (HTTPS) | `https://localhost`              |
| Caddy      | 80 (HTTP)   | Automatically redirects to HTTPS |
| API Server | 3001        | Internal only (via Caddy)        |
| Admin Vite | 4200        | Internal only (via Caddy)        |
| User Vite  | 4201        | Internal only (via Caddy)        |

## Production Deployment

**Do NOT use Caddy's local CA in production.**

For production:

1. Set `API_URL` to your actual domain (e.g., `https://your-domain.com`)
2. Use a reverse proxy (Caddy, nginx, Traefik, or cloud load balancer) with real SSL certificates
3. Point the reverse proxy to your API server (running on HTTP internally)
4. Caddy can also be used in production with automatic Let's Encrypt certificates

Example production Caddyfile:

```caddyfile
your-domain.com {
    # Caddy automatically gets Let's Encrypt certificates
    reverse_proxy api:3001
}
```

## Troubleshooting

### "caddy: command not found"

**Problem:** Caddy is not installed or not in PATH.

**Solution:**

```bash
# macOS
brew install caddy

# Linux - see installation instructions above

# Verify installation
caddy version
```

### "Permission denied" when running Caddy

**Problem:** Caddy needs permission to bind to port 443 (privileged port).

**Solutions:**

**Option 1: Run with sudo (macOS/Linux):**

```bash
sudo caddy run --config Caddyfile --adapter caddyfile
```

**Option 2: Use a non-privileged port:**

Edit `Caddyfile` to use port 8443:

```caddyfile
localhost:8443 {
    # ... rest of config
}
```

Then access via `https://localhost:8443`

**Option 3: Grant Caddy permission to bind privileged ports (Linux):**

```bash
sudo setcap cap_net_bind_service=+ep $(which caddy)
```

### "x509: certificate signed by unknown authority"

**Problem:** Caddy's local CA is not installed in your system trust store.

**Solution:**

```bash
caddy trust
```

This may require sudo/administrator password. If it still doesn't work, try:

1. Uninstall old CA: `caddy untrust`
2. Reinstall: `caddy trust`
3. Restart your browser

### Vite HMR (Hot Module Replacement) Not Working

**Problem:** File changes don't trigger browser reload.

**Solution:** The Caddyfile already includes WebSocket support for HMR. If it's still not working:

1. Check Vite is running: `curl http://localhost:4200`
2. Check Caddy logs for WebSocket upgrade errors
3. Try restarting all services: `Ctrl+C` then `pnpm dev`

### Port Already in Use

**Problem:** Port 443 or other ports are already bound.

**Solutions:**

1. **Find what's using port 443:**

   ```bash
   # macOS/Linux
   sudo lsof -i :443

   # Windows
   netstat -ano | findstr :443
   ```

2. **Stop the conflicting service** or **use a different port** (see above)

### Slack OAuth Returns "invalid_redirect_uri"

**Problem:** Redirect URI mismatch.

**Solutions:**

1. Verify Slack app has `https://localhost/auth/slack/callback` (no port)
2. Check `API_URL=https://localhost` in `.env.local`
3. Ensure Caddy is running on port 443
4. Restart API server after environment changes

## Advanced Configuration

### Custom Domain

To use a custom local domain (e.g., `myapp.local`):

1. **Edit `/etc/hosts`:**

   ```
   127.0.0.1 myapp.local
   ```

2. **Update Caddyfile:**

   ```caddyfile
   myapp.local {
       # ... your config
   }
   ```

3. **Update environment:**

   ```bash
   API_URL=https://myapp.local
   ```

4. **Update Slack redirect URL:**
   ```
   https://myapp.local/auth/slack/callback
   ```

### Different Port for API

If you need to run the API on a different port:

```bash
# In .env.local
PORT=3002
```

Update Caddyfile:

```caddyfile
localhost {
    handle /api/* {
        reverse_proxy localhost:3002  # Update port here
    }
    # ...
}
```

### CORS Configuration

Caddy automatically handles CORS headers when needed. If you need custom CORS:

```caddyfile
localhost {
    header Access-Control-Allow-Origin https://localhost
    header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    # ... rest of config
}
```

## Additional Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Caddy Reverse Proxy Guide](https://caddyserver.com/docs/quick-starts/reverse-proxy)
- [Caddy Local HTTPS](https://caddyserver.com/docs/automatic-https#local-https)
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [OAUTH-SETUP.md](./OAUTH-SETUP.md) - Full OAuth setup guide

## Need Help?

If you encounter issues not covered here:

1. Check the [OAUTH-SETUP.md](./OAUTH-SETUP.md) troubleshooting section
2. Verify all environment variables are set correctly
3. Check Caddy logs: `caddy run` (without `-d` flag)
4. Check API server logs for specific error messages
5. Ensure all services are running: `ps aux | grep -E "(caddy|vite|node)"`

---

**Last Updated:** January 2025
