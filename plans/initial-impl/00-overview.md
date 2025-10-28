# Slack-Linear Rundown - Project Overview

## Executive Summary

The **Slack-Linear Rundown** is an automated weekly status reporting system that helps developers stay focused on their priorities. It integrates Linear's project management platform with Slack's messaging platform to deliver personalized weekly summaries of each developer's assigned work, directly to their Slack DMs.

**Key Innovation**: The system understands developer work cycles, tracking "cooldown periods" when developers focus on non-feature work (refactoring, tech debt, documentation) and adjusts report messaging accordingly.

## The Problem

Developers often lose track of:
- What issues they're actively working on across multiple projects
- Which tasks were completed last week
- What should be prioritized this week
- When they're scheduled for cooldown periods vs. feature work

Traditional project management tools require active checking, and developers may not get a holistic view of their week's work without manual effort.

## The Solution

An automated system that:
1. **Fetches** work data from Linear (issues assigned to each developer)
2. **Analyzes** what happened in the past week (completed, started, updated)
3. **Contextualizes** with cooldown period awareness
4. **Delivers** a personalized summary via Slack DM every Monday morning

## Core Features (MVP)

### 1. Automatic User Mapping
- Maps Slack users to Linear users via email addresses
- No manual configuration required
- Daily sync to handle team changes

### 2. Weekly Report Generation
- Shows issues completed, started, and updated in the past 7 days
- Groups issues by project
- Provides clear, scannable summaries

### 3. Cooldown Period Tracking
- Developers can set their next cooldown start date and duration
- Reports acknowledge cooldown status with adjusted messaging
- Helps set appropriate expectations for feature vs. refactor work

### 4. Automated Delivery
- Runs every Monday at 9:00 AM (configurable)
- Sends personalized DMs via Slack
- Handles errors gracefully with automatic retries

### 5. Health Monitoring
- Health check endpoint for monitoring
- Delivery logging for troubleshooting
- Comprehensive error handling

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────┐
│         Express Server (Node.js)         │
│  - REST API                             │
│  - Scheduled Jobs (node-cron)           │
│  - Business Logic Services              │
└─────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
    ┌────────┐    ┌────────┐    ┌──────────┐
    │ Slack  │    │ Linear │    │  SQLite  │
    │  API   │    │  API   │    │    DB    │
    └────────┘    └────────┘    └──────────┘
```

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Monorepo**: Nx
- **Database**: SQLite (better-sqlite3)
- **Scheduling**: node-cron
- **APIs**: @slack/web-api, graphql-request
- **Deployment**: Docker + Docker Compose

### Nx Workspace Structure

```
slack-linear-rundown/
├── apps/
│   └── api/                   # Express server application
│       ├── src/
│       │   ├── app/
│       │   │   ├── routes/    # HTTP endpoints
│       │   │   ├── services/  # Business logic
│       │   │   └── jobs/      # Scheduled tasks
│       │   └── main.ts
│       └── project.json
├── libs/
│   ├── database/              # SQLite database library
│   │   ├── src/lib/
│   │   │   ├── repositories/  # Data access layer
│   │   │   ├── migrations/    # Schema migrations
│   │   │   └── schema.ts
│   │   └── project.json
│   ├── linear/                # Linear API client
│   │   ├── src/lib/
│   │   │   ├── linear-client.ts
│   │   │   ├── queries.ts     # GraphQL queries
│   │   │   └── types.ts
│   │   └── project.json
│   └── slack/                 # Slack API client
│       ├── src/lib/
│       │   ├── slack-client.ts
│       │   ├── formatters.ts  # Message formatting
│       │   └── types.ts
│       └── project.json
└── plans/                     # Architecture & planning docs
```

## Data Model

### Database Tables

**users**
- Stores mapping: email ↔ Slack user ID ↔ Linear user ID
- Tracks active/inactive status

**cooldown_schedules**
- User's next cooldown start date
- Cooldown duration in weeks

**report_delivery_log**
- Delivery history (success/failure)
- Report metadata (period, issue count)

**app_config**
- Application configuration (tokens, schedules)

## User Experience

### Weekly Report Example

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
  • ENG-210: Fix flaky test suite (last updated Oct 5)
  ... (6 more)

Next cooldown: Nov 3 (2 weeks)
```

**Key Features**:
- Shows ALL open issues, not just recently touched ones
- Highlights what happened this week (completed, started, updated)
- Surfaces stale issues that may need attention
- Groups by project for clarity

### Cooldown Mode Report

When a developer is in cooldown, the report filters to show only cooldown-appropriate work:

```
Good morning, Jane! Here's your rundown.

🌴 You're in cooldown mode (Week 1 of 2)
Focus: Maintenance, tech debt, and miscellaneous work
Ends: Nov 10

📊 Summary:
• Total open issues: 8 (cooldown-appropriate only)
• Completed this week: 3
• Started this week: 1
• Updated this week: 2
• Not recently touched: 5

✅ Completed This Week:
  Project: Misc Tasks
  • ENG-300: Update team documentation (completed Tue)

  No Project:
  • ENG-156: Fix login redirect bug (completed Fri)
  • ENG-305: Refactor error handling (completed Thu)

🚀 Started This Week:
  No Project:
  • ENG-310: Tech debt: Update dependencies (started Mon)

📝 Updated This Week:
  No Project:
  • ENG-175: Performance optimization (last updated Fri)
  • ENG-315: Code review backlog (last updated Wed)

📋 Other Open Issues (not recently touched):
  Project: DPE Tasks
  • ENG-320: Improve CI pipeline (last updated Oct 10)

  No Project:
  • ENG-205: Tech debt: Refactor auth module (last updated Oct 8)
  • ENG-210: Fix flaky test suite (last updated Oct 5)
  ... (2 more)

Cooldown ends: Nov 10
```

**Cooldown Filtering**:
- Excludes all project board issues EXCEPT those from projects with "misc" or "DPE" in the name
- Shows unboarded work (issues not assigned to any project)
- Helps developers focus on maintenance, tech debt, and miscellaneous tasks during cooldown

## API Endpoints

### Health & Monitoring
- `GET /api/health` - Health check with component status

### Cooldown Management
- `POST /api/cooldown/set` - Set cooldown schedule
- `GET /api/cooldown/:userId` - Get cooldown schedule
- `PUT /api/cooldown/:userId` - Update cooldown schedule
- `DELETE /api/cooldown/:userId` - Delete cooldown schedule

### Reports
- `POST /api/trigger-report` - Manually trigger reports (all users or specific user)

### Slack Integration
- `POST /slack/events` - Handle Slack Event API webhooks

## Deployment

### Quick Start with Docker Compose

```bash
# 1. Clone repository
git clone <repo-url>
cd slack-linear-rundown

# 2. Configure environment
cp .env.example .env
# Edit .env with your Slack bot token and Linear API key

# 3. Start services
docker-compose up -d

# 4. Verify health
curl http://localhost:3000/api/health
```

### Environment Variables

```bash
# Required
SLACK_BOT_TOKEN=xoxb-...           # From Slack App settings
LINEAR_API_KEY=lin_api_...         # From Linear settings
SLACK_SIGNING_SECRET=...           # From Slack App settings

# Optional
DATABASE_PATH=/data/rundown.db     # SQLite file location
PORT=3000                          # API server port
REPORT_SCHEDULE="0 9 * * 1"        # Cron: Monday 9 AM
LOG_LEVEL=info                     # Logging verbosity
```

## Scheduled Jobs

### Weekly Report Job
- **Schedule**: Monday 9:00 AM (configurable)
- **Function**: Generate and deliver reports to all active users
- **Duration**: ~2-5 seconds per user

### User Sync Job
- **Schedule**: Daily 2:00 AM
- **Function**: Sync Slack users with database, mark inactive users
- **Duration**: ~1-2 seconds

## Security & Compliance

### Data Storage
- **Local Only**: All data stored in local SQLite database
- **No Cloud**: No data sent to third-party services
- **Minimal**: Only stores necessary user mappings and logs

### API Security
- **Token Storage**: Environment variables only, never committed
- **Signature Verification**: All Slack webhooks verified
- **Rate Limiting**: Respects all external API limits
- **Input Validation**: All inputs validated with Zod schemas

### Privacy
- **Opt-out**: Users can disable DMs from bot
- **No Tracking**: No analytics or tracking beyond delivery logs
- **Transparent**: All code open source

## Scalability & Performance

### Current Design (MVP)
- **Target**: Up to 100 developers
- **Database**: SQLite (single instance)
- **Processing**: Synchronous report generation

**Performance Targets**:
- Report generation: <2 seconds per user
- Slack delivery: <1 second per message
- API response time: <500ms

### Future Scaling (v2+)
When needed for larger organizations:
- Migrate to PostgreSQL for multi-instance support
- Add job queue (BullMQ) for async processing
- Implement Redis caching for user mappings
- Horizontal scaling with load balancer

## Implementation Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 0**: Project Setup | 2-3 days | Nx workspace, libraries, Docker |
| **Phase 1**: Core Services | 4-5 days | Express app, services, business logic |
| **Phase 2**: API Routes | 2-3 days | HTTP endpoints, validation |
| **Phase 3**: Scheduled Jobs | 2-3 days | Cron jobs, automation |
| **Phase 4**: Testing & QA | 2-3 days | Unit tests, integration tests, coverage |
| **Phase 5**: Documentation | 2-3 days | README, guides, deployment docs |

**Total Time**: 14-20 days (2-4 weeks)
**With Parallel Work**: 10-14 days

## Success Metrics

### MVP Success Criteria
- [ ] 95%+ weekly report delivery success rate
- [ ] <2 seconds average report generation time
- [ ] Zero critical bugs in first 2 weeks
- [ ] 80%+ test coverage
- [ ] Positive user feedback from pilot group

### Future Metrics (v2+)
- Weekly active users
- Report open rate (via Slack analytics)
- Cooldown adoption rate
- API uptime (99.9% target)

## Future Enhancements (Post-MVP)

See `03-features.md` for full details. Key Phase 2 features:

1. **Interactive Slack Commands** (P1)
   - `/rundown cooldown set <date> <duration>`
   - `/rundown report` - Trigger immediate report
   - `/rundown help` - Show commands

2. **Rich Message Formatting** (P1)
   - Slack Block Kit for better UI
   - Collapsible sections
   - Inline links to Linear issues
   - Color-coded priorities

3. **Team-Level Reports** (P2)
   - Aggregate reports for team leads
   - Team velocity metrics
   - Posted to team channels

4. **Customizable Reports** (P2)
   - User preferences (frequency, content)
   - Filter by project/team
   - Adjustable time windows

5. **Analytics Dashboard** (P3)
   - Web UI for viewing trends
   - Historical reports
   - Team comparisons

## Documentation Index

- **00-overview.md** ← You are here
- **01-api-research.md** - Linear & Slack API capabilities
- **02-architecture.md** - Detailed system architecture
- **03-features.md** - Feature breakdown and requirements
- **04-implementation-roadmap.md** - Phase-by-phase implementation plan

## Getting Started

### For Developers
1. Read this overview
2. Review architecture: `02-architecture.md`
3. Follow implementation roadmap: `04-implementation-roadmap.md`
4. Start with Phase 0: Project Setup

### For Users
1. Wait for deployment completion
2. Ensure your email matches in Slack and Linear
3. Optionally set cooldown schedule via API
4. Receive first report next Monday at 9 AM

### For Admins
1. Set up Slack app (see deployment guide)
2. Get Linear API key
3. Configure environment variables
4. Deploy via Docker Compose
5. Monitor health endpoint and logs

## Questions & Support

- **Architecture Questions**: See `02-architecture.md`
- **Feature Details**: See `03-features.md`
- **Implementation Help**: See `04-implementation-roadmap.md`
- **API Research**: See `01-api-research.md`

## License

TBD - To be determined based on organization preferences.

---

**Ready to build?** Start with Phase 0 in `04-implementation-roadmap.md`!
