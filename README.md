# Slack-Linear Rundown

An automated weekly status reporting system that integrates Linear's project management platform with Slack's messaging platform to deliver personalized weekly summaries of each developer's assigned work.

**Key Innovation**: The system understands developer work cycles, tracking "cooldown periods" when developers focus on non-feature work (refactoring, tech debt, documentation) and adjusts report content accordingly.

## Features

- ✅ **Automatic User Mapping** - Maps Slack users to Linear users via email addresses
- ✅ **Weekly Report Generation** - Shows ALL open issues with recent activity highlighted
- ✅ **Smart Aggregation** - Aggregates large issue lists by priority with Linear search links
- ✅ **Cooldown Period Tracking** - Filters reports to show only cooldown-appropriate work
- ✅ **Automated Delivery** - Sends personalized DMs via Slack every Monday at 9 AM
- ✅ **Health Monitoring** - Health check endpoint for monitoring
- ✅ **Docker Deployment** - Production-ready Docker configuration

## Architecture

```
slack-linear-rundown/
├── apps/
│   └── api/                         # Express server application
│       ├── src/
│       │   ├── app/
│       │   │   ├── routes/          # HTTP endpoints
│       │   │   ├── services/        # Business logic
│       │   │   ├── jobs/            # Scheduled tasks
│       │   │   ├── middleware/      # Express middleware
│       │   │   └── utils/           # Utilities (logger)
│       │   ├── environment/         # Configuration
│       │   └── main.ts              # Entry point
│       └── package.json
├── libs/
│   ├── database/                    # SQLite database library
│   │   ├── src/lib/
│   │   │   ├── repositories/        # Data access layer
│   │   │   ├── migrations/          # Schema migrations
│   │   │   ├── schema.ts            # Table definitions
│   │   │   └── db.ts                # Connection manager
│   │   └── package.json
│   ├── linear/                      # Linear API client
│   │   ├── src/lib/
│   │   │   ├── linear-client.ts     # GraphQL client
│   │   │   ├── queries.ts           # GraphQL queries
│   │   │   └── types.ts             # TypeScript types
│   │   └── package.json
│   └── slack/                       # Slack API client
│       ├── src/lib/
│       │   ├── slack-client.ts      # Web API client
│       │   ├── formatters.ts        # Message formatting
│       │   └── types.ts             # TypeScript types
│       └── package.json
├── plans/                           # Architecture & planning docs
├── docker-compose.yml               # Docker orchestration
├── Dockerfile                       # API container
└── package.json
```

## Prerequisites

- Node.js 20+
- **Caddy** - For local HTTPS development ([installation guide](./LOCAL-HTTPS-SETUP.md#1-install-caddy))
- Docker and Docker Compose (for deployment)
- Slack workspace with admin access
- Linear workspace

## Quick Start

### 1. Set Up Slack App

1. Go to https://api.slack.com/apps
2. Create a new app (From scratch)
3. Configure OAuth & Permissions:
   - Add Bot Token Scopes:
     - `chat:write` - Send messages
     - `users:read` - List users
     - `users:read.email` - Get user emails
     - `conversations:write` - Open DM conversations (optional)
4. Install app to workspace
5. Copy Bot User OAuth Token (starts with `xoxb-`)

### 2. Get Linear API Key

1. Go to Linear Settings → API
2. Create a Personal API Key
3. Copy the API key (starts with `lin_api_`)

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Required variables:
```env
SLACK_BOT_TOKEN=xoxb-your-token-here
LINEAR_API_KEY=lin_api_your-key-here
SLACK_SIGNING_SECRET=your-signing-secret-here
```

### 4. Run with Docker Compose

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3000/api/health
```

### 5. Verify Setup

1. Health check should return `{"status":"ok"}`
2. Check logs for successful database initialization
3. Check logs for scheduled job initialization

## Development

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
# Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run API server
npx nx serve api

# The server will start on http://localhost:3000
```

### HTTPS Setup for OAuth Development

⚠️ **Required for OAuth:** Slack requires HTTPS for OAuth callbacks, even in local development.

We use **Caddy** as a reverse proxy to handle HTTPS with automatic locally-trusted certificates - no browser warnings!

**Quick Setup:**

```bash
# 1. Install Caddy (one-time setup)
brew install caddy  # macOS
# For Linux/Windows, see LOCAL-HTTPS-SETUP.md

# 2. Install Caddy's local CA (one-time setup)
caddy trust

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials
# API_URL=https://localhost (already set by default)

# 4. Update Slack app redirect URL to: https://localhost/auth/slack/callback

# 5. Start all services with Caddy
pnpm dev
```

The application will run on `https://localhost` with:
- **No browser security warnings** (Caddy's certificates are auto-trusted)
- **Automatic HTTP→HTTPS redirect**
- **Hot Module Replacement (HMR)** for admin and user UIs

**📖 Full Documentation:** See [LOCAL-HTTPS-SETUP.md](./docs/setup/LOCAL-HTTPS-SETUP.md) for detailed setup, troubleshooting, and advanced configuration.

### Build All Projects

```bash
npx nx run-many -t build --all
```

### Run Tests

```bash
npx nx run-many -t test --all
```

### Lint

```bash
npx nx run-many -t lint --all
```

## API Endpoints

### Health & Monitoring
- `GET /api/health` - Health check with database connectivity test

### Cooldown Management
- `POST /api/cooldown/set` - Set cooldown schedule
  ```json
  {
    "userId": 1,
    "nextStart": "2025-11-03",
    "durationWeeks": 2
  }
  ```
- `GET /api/cooldown/:userId` - Get cooldown schedule
- `DELETE /api/cooldown/:userId` - Delete cooldown schedule

### Reports
- `POST /api/trigger-report` - Manually trigger report generation
  ```json
  {
    "userId": 1  // Optional - if omitted, sends to all active users
  }
  ```

### Slack Integration
- `POST /slack/events` - Handle Slack Event API webhooks

## Environment Variables

### Required

- `SLACK_BOT_TOKEN` - Slack Bot User OAuth Token (xoxb-*)
- `LINEAR_API_KEY` - Linear Personal API Key (lin_api_*)
- `SLACK_SIGNING_SECRET` - Slack app signing secret

### Optional (with defaults)

- `DATABASE_PATH` - SQLite database file path (default: `./data/rundown.db`)
- `PORT` - API server port (default: `3000`)
- `NODE_ENV` - Environment (default: `development`)
- `REPORT_SCHEDULE` - Cron expression for weekly reports (default: `0 9 * * 1` - Monday 9 AM)
- `LOG_LEVEL` - Logging level (default: `info`)

## Scheduled Jobs

### Weekly Report Job
- **Schedule**: Monday at 9:00 AM (configurable via `REPORT_SCHEDULE`)
- **Function**: Generates and delivers reports to all active users
- **Duration**: ~2-5 seconds per user

### User Sync Job
- **Schedule**: Daily at 2:00 AM
- **Function**: Syncs Slack users with database, marks inactive users
- **Duration**: ~1-2 seconds

## How It Works

### Report Generation

1. **Fetch Linear Data**: Queries Linear for ALL assigned issues
   - Fetches open issues + recently closed (past month)
   - Optimizes by excluding old closed issues

2. **Categorize Issues**: Groups issues into 4 buckets
   - Recently Completed (last 7 days)
   - Recently Started (last 7 days)
   - Recently Updated (last 7 days)
   - Other Open Issues (not recently touched)

3. **Apply Cooldown Filtering** (if user in cooldown):
   - Excludes all project board issues
   - Includes issues NOT on a project board
   - Includes issues from projects with "misc" or "DPE" in name

4. **Format Report**: Creates plain text message with:
   - Summary statistics
   - Categorized issue lists
   - Cooldown status (if applicable)

5. **Deliver via Slack**: Sends DM to user

### User Mapping

- Daily sync fetches all Slack workspace users
- Maps users by email address (common key between Slack and Linear)
- Marks users not in Slack as inactive
- No manual configuration required

## Example Report

```
Good morning, Jane! Here's your rundown.

📊 Summary:
• Total open issues: 15
• Completed this week: 5
• Started this week: 2
• Updated this week: 3
• Not recently touched: 10

✅ Completed This Week:
  Project: Backend API
  • ENG-123: Implement user authentication (completed Mon)
  • ENG-145: Add rate limiting to API (completed Wed)

  No Project:
  • ENG-156: Fix login redirect bug (completed Fri)

🚀 Started This Week:
  • ENG-178: Database migration for v2 (started Mon)
  • ENG-180: Refactor error handling (started Thu)

📝 Updated This Week:
  Project: Backend API
  • ENG-167: API documentation (last updated Tue)
  • ENG-172: Code review feedback (last updated Wed)

📋 Other Open Issues (not recently touched):
  Project: Backend API
  • ENG-190: Database index optimization (last updated Oct 15)
  • ENG-195: Add monitoring dashboards (last updated Oct 10)

  No Project:
  • ENG-205: Tech debt: Refactor auth module (last updated Oct 8)
  ... (6 more)

Next cooldown: Nov 3 (2 weeks)
```

## Cooldown Mode

When a developer is in cooldown, the report automatically filters to show only cooldown-appropriate work:

- Issues **NOT** on a project board (unboarded work)
- Issues from projects with "misc" or "DPE" in the name (case-insensitive)
- All other project board issues are hidden

This helps developers focus on maintenance, tech debt, and miscellaneous tasks during cooldown periods.

## Smart Aggregation

When a report category has more than 10 issues, the system automatically switches to an aggregated view showing priority summaries with clickable Linear search links:

```
📋 Other Open Issues
  📊 Priority Summary (45 total):
    🔴 Urgent: 3 issues → https://linear.app/ENG/issues?filter=assignee:123+priority:1
    🟠 High: 12 issues → https://linear.app/ENG/issues?filter=assignee:123+priority:2
    🟡 Medium: 18 issues → https://linear.app/ENG/issues?filter=assignee:123+priority:3
    🟢 Low: 8 issues → https://linear.app/ENG/issues?filter=assignee:123+priority:4
    ⚪ None: 4 issues → https://linear.app/ENG/issues?filter=assignee:123+priority:0
```

This makes reports with many issues scannable and actionable. See `AGGREGATION-FEATURE.md` for details.

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Monorepo**: Nx
- **Database**: SQLite (better-sqlite3)
- **Scheduling**: node-cron
- **Slack SDK**: @slack/web-api
- **GraphQL**: graphql-request (for Linear)
- **Validation**: Zod
- **Logging**: Winston
- **Deployment**: Docker + Docker Compose

## Testing

All libraries include comprehensive test coverage:

```bash
# Run all tests
npx nx run-many -t test --all

# Run tests for specific library
npx nx test database
npx nx test linear
npx nx test slack

# Run tests with coverage
npx nx run-many -t test --all --coverage
```

## Troubleshooting

### Database Issues

Check database file permissions:
```bash
ls -la ./data/rundown.db
```

Reset database (DANGER - deletes all data):
```bash
rm ./data/rundown.db
# Restart server to reinitialize
```

### Slack Connection Issues

Verify bot token:
```bash
curl -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
     https://slack.com/api/auth.test
```

### Linear Connection Issues

Verify API key:
```bash
curl -H "Authorization: $LINEAR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"query":"{ viewer { id name email } }"}' \
     https://api.linear.app/graphql
```

### Logs

View application logs:
```bash
# Docker
docker-compose logs -f api

# Local development
# Logs are output to console
```

## Production Deployment

1. **Set up environment variables** securely (use secrets management)
2. **Configure persistent volume** for SQLite database
3. **Set up monitoring** using health check endpoint
4. **Configure log aggregation** (Winston JSON format in production)
5. **Set up alerts** for delivery failures
6. **Regular backups** of SQLite database file

## Security Considerations

- ✅ Bot tokens stored in environment variables
- ✅ Slack signature verification for webhooks
- ✅ SQLite database file permissions
- ✅ Non-root user in Docker container
- ✅ No secrets in code or logs
- ✅ Input validation with Zod

## Future Enhancements

See `plans/03-features.md` for full roadmap. Key Phase 2 features:

- Interactive Slack commands (`/rundown cooldown set`, `/rundown report`)
- Rich message formatting with Slack Block Kit
- Team-level reports for team leads
- Analytics dashboard
- Customizable report content

## Contributing

This project follows:
- TypeScript strict mode
- ESLint for code quality
- Prettier for formatting
- Nx for monorepo management

## Documentation

### Setup Guides

- **[LOCAL-HTTPS-SETUP.md](./docs/setup/LOCAL-HTTPS-SETUP.md)** - HTTPS setup for local OAuth development (required)
- **[OAUTH-SETUP.md](./docs/setup/OAUTH-SETUP.md)** - Complete Slack OAuth configuration guide
- **[AGGREGATION-FEATURE.md](./docs/features/AGGREGATION-FEATURE.md)** - Smart report aggregation feature

### Planning Documentation

Comprehensive planning documentation is available in the `plans/` directory:

- `00-overview.md` - Project overview and quick start
- `01-api-research.md` - Linear & Slack API research
- `02-architecture.md` - Detailed system architecture
- `03-features.md` - Feature breakdown and requirements
- `04-implementation-roadmap.md` - Implementation plan
- `CHANGELOG.md` - Requirement changes and updates

## License

TBD

## Support

For issues and questions:
- Check the documentation in `plans/` directory
- Review troubleshooting section above
- Check application logs for error messages
