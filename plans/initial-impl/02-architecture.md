# System Architecture

## Overview

The Slack-Linear Rundown system is designed as a scheduled service that fetches Linear project/issue data and delivers personalized weekly status reports to developers via Slack DMs. It includes cooldown period tracking to adjust report content based on developer work cycles.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │          Express Server (API Application)         │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐    │     │
│  │  │  REST API Routes                         │    │     │
│  │  │  - POST /slack/events (Slack webhooks)   │    │     │
│  │  │  - POST /api/cooldown (manage cooldowns) │    │     │
│  │  │  - POST /api/trigger-report (manual)     │    │     │
│  │  │  - GET  /api/health                      │    │     │
│  │  └──────────────────────────────────────────┘    │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐    │     │
│  │  │  Scheduled Jobs (node-cron)              │    │     │
│  │  │  - Weekly report generation & delivery   │    │     │
│  │  │  - User mapping sync (daily)             │    │     │
│  │  └──────────────────────────────────────────┘    │     │
│  │                                                    │     │
│  │  ┌──────────────────────────────────────────┐    │     │
│  │  │  Service Layer                           │    │     │
│  │  │  - ReportGenerationService               │    │     │
│  │  │  - ReportDeliveryService                 │    │     │
│  │  │  - UserMappingService                    │    │     │
│  │  │  - CooldownService                       │    │     │
│  │  └──────────────────────────────────────────┘    │     │
│  │                                                    │     │
│  │  Uses:                                             │     │
│  │  - @slack-linear-rundown/slack (library)          │     │
│  │  - @slack-linear-rundown/linear (library)         │     │
│  │  - @slack-linear-rundown/database (library)       │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │              SQLite Database                      │     │
│  │  (Volume-mounted for persistence)                 │     │
│  │                                                    │     │
│  │  Tables:                                          │     │
│  │  - users (user mappings)                          │     │
│  │  - cooldown_schedules                             │     │
│  │  - report_delivery_log                            │     │
│  │  - app_config                                     │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   Slack API      │          │   Linear API     │
│                  │          │                  │
│ - Send DMs       │          │ - Query issues   │
│ - Get users      │          │ - Query projects │
│ - Event webhooks │          │ - Query teams    │
└──────────────────┘          └──────────────────┘
```

## Component Breakdown

### 1. Nx Workspace Structure

```
slack-linear-rundown/
├── apps/
│   └── api/                          # Express server application
│       ├── src/
│       │   ├── main.ts               # Entry point
│       │   ├── app/
│       │   │   ├── routes/           # Express routes
│       │   │   │   ├── slack.routes.ts
│       │   │   │   ├── cooldown.routes.ts
│       │   │   │   └── health.routes.ts
│       │   │   ├── services/         # Business logic
│       │   │   │   ├── report-generation.service.ts
│       │   │   │   ├── report-delivery.service.ts
│       │   │   │   ├── user-mapping.service.ts
│       │   │   │   └── cooldown.service.ts
│       │   │   ├── jobs/             # Scheduled tasks
│       │   │   │   ├── weekly-report.job.ts
│       │   │   │   └── user-sync.job.ts
│       │   │   └── middleware/       # Express middleware
│       │   │       ├── error-handler.ts
│       │   │       └── slack-signature-verification.ts
│       │   └── environment/
│       │       └── environment.ts    # Config
│       ├── project.json
│       └── tsconfig.app.json
├── libs/
│   ├── slack/                        # Slack API client library
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── slack-client.ts   # Main client
│   │   │   │   ├── types.ts          # TypeScript types
│   │   │   │   └── formatters.ts     # Message formatters
│   │   │   └── index.ts
│   │   ├── project.json
│   │   └── tsconfig.lib.json
│   ├── linear/                       # Linear API client library
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── linear-client.ts  # GraphQL client
│   │   │   │   ├── queries.ts        # GraphQL queries
│   │   │   │   └── types.ts          # TypeScript types
│   │   │   └── index.ts
│   │   ├── project.json
│   │   └── tsconfig.lib.json
│   └── database/                     # SQLite database library
│       ├── src/
│       │   ├── lib/
│       │   │   ├── db.ts             # Database connection
│       │   │   ├── schema.ts         # Schema definitions
│       │   │   ├── migrations/       # Migration files
│       │   │   └── repositories/     # Data access layer
│       │   │       ├── users.repository.ts
│       │   │       ├── cooldowns.repository.ts
│       │   │       └── reports.repository.ts
│       │   └── index.ts
│       ├── project.json
│       └── tsconfig.lib.json
├── plans/                            # Architecture & planning docs
├── docker-compose.yml                # Docker orchestration
├── Dockerfile                        # API container
├── package.json
├── nx.json
└── tsconfig.base.json
```

### 2. Library Descriptions

#### `@slack-linear-rundown/slack`
**Purpose**: Abstract Slack Web API interactions

**Key Responsibilities**:
- Send direct messages to users
- Fetch workspace users (with pagination)
- Verify Slack request signatures
- Format messages using Block Kit
- Handle rate limiting and retries

**Key Exports**:
```typescript
class SlackClient {
  sendDM(userId: string, message: SlackMessage): Promise<void>
  getUsers(): Promise<SlackUser[]>
  scheduleMessage(userId: string, message: SlackMessage, timestamp: number): Promise<string>
}

interface SlackMessage {
  text: string
  blocks?: Block[]
}

interface SlackUser {
  id: string
  email: string
  realName: string
}
```

#### `@slack-linear-rundown/linear`
**Purpose**: Abstract Linear GraphQL API interactions

**Key Responsibilities**:
- Query user's assigned issues with filters
- Query user's teams and projects
- Handle pagination for large result sets
- Manage rate limiting
- Format GraphQL queries

**Key Exports**:
```typescript
class LinearClient {
  getCurrentUser(): Promise<LinearUser>
  getAssignedIssues(userId: string, filters: IssueFilters): Promise<LinearIssue[]>
  getWeeklyReport(userId: string, startDate: Date): Promise<WeeklyReport>
}

interface LinearIssue {
  id: string
  identifier: string  // "ENG-123"
  title: string
  state: { name: string; type: string }
  project?: { name: string }
  priority: number
  estimate?: number
}

interface WeeklyReport {
  user: LinearUser
  issuesCompleted: LinearIssue[]
  issuesInProgress: LinearIssue[]
  issuesUpdated: LinearIssue[]
}
```

#### `@slack-linear-rundown/database`
**Purpose**: Manage local state in SQLite

**Key Responsibilities**:
- Store user identity mappings
- Track cooldown schedules
- Log report deliveries
- Manage app configuration
- Run migrations

**Key Exports**:
```typescript
class Database {
  initialize(): Promise<void>
  runMigrations(): Promise<void>
}

class UsersRepository {
  findByEmail(email: string): Promise<User | null>
  findBySlackId(slackId: string): Promise<User | null>
  upsert(user: User): Promise<void>
  syncUsers(slackUsers: SlackUser[], linearUsers: LinearUser[]): Promise<void>
}

class CooldownsRepository {
  getByUserId(userId: string): Promise<CooldownSchedule | null>
  upsert(schedule: CooldownSchedule): Promise<void>
  isUserInCooldown(userId: string, date: Date): Promise<boolean>
}

class ReportsRepository {
  logDelivery(log: ReportLog): Promise<void>
  getDeliveryHistory(userId: string, limit: number): Promise<ReportLog[]>
}
```

### 3. Express Server Application (`apps/api`)

#### Routes

**`/slack/events` (POST)**
- Handle Slack Event API webhooks
- URL verification challenge
- Interactive component callbacks (future)
- Slash commands (future)

**`/api/cooldown` (POST, PUT, DELETE)**
- Create/update/delete cooldown schedules
- Query: `POST /api/cooldown/set { userId, nextStart, durationWeeks }`
- Query: `GET /api/cooldown/:userId`

**`/api/trigger-report` (POST)**
- Manually trigger report generation for testing
- Query: `POST /api/trigger-report { userId? }` (if no userId, send to all)

**`/api/health` (GET)**
- Health check endpoint
- Database connectivity
- External API status

#### Services

**ReportGenerationService**
- Fetch Linear data for a user
- Apply cooldown logic to customize content
- Format data into structured report
- Calculate metrics (issues completed, in progress, etc.)

**ReportDeliveryService**
- Take formatted report and send via Slack
- Handle delivery errors and retries
- Log delivery status
- Rate limit awareness

**UserMappingService**
- Sync Slack users with database
- Map Linear users to Slack users via email
- Handle user updates (new hires, departures)

**CooldownService**
- Determine if user is currently in cooldown
- Calculate next cooldown start date
- Update cooldown schedules
- Generate cooldown-specific messaging

#### Scheduled Jobs

**Weekly Report Job** (node-cron)
- Runs: Every Monday at 9:00 AM (configurable)
- Logic:
  1. Fetch all active users from database
  2. For each user:
     - Check cooldown status
     - Generate personalized report
     - Deliver via Slack
     - Log result
  3. Handle errors and send alerts

**User Sync Job** (node-cron)
- Runs: Daily at 2:00 AM
- Logic:
  1. Fetch all Slack workspace users
  2. Update database mappings
  3. Mark deactivated users
  4. Log sync results

### 4. Database Schema

#### `users` Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  slack_user_id TEXT UNIQUE,
  linear_user_id TEXT UNIQUE,
  slack_real_name TEXT,
  linear_name TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_slack_id ON users(slack_user_id);
CREATE INDEX idx_users_linear_id ON users(linear_user_id);
```

#### `cooldown_schedules` Table
```sql
CREATE TABLE cooldown_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  next_cooldown_start DATE NOT NULL,
  cooldown_duration_weeks INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_cooldown_user ON cooldown_schedules(user_id);
CREATE INDEX idx_cooldown_start_date ON cooldown_schedules(next_cooldown_start);
```

#### `report_delivery_log` Table
```sql
CREATE TABLE report_delivery_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  sent_at DATETIME NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed', 'skipped'
  error_message TEXT,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  issues_count INTEGER,
  in_cooldown BOOLEAN DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_log_user ON report_delivery_log(user_id);
CREATE INDEX idx_report_log_sent_at ON report_delivery_log(sent_at);
```

#### `app_config` Table
```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stores: slack_bot_token, linear_api_key, report_schedule_cron, etc.
```

### 5. Docker Compose Configuration

```yaml
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/data/rundown.db
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
      - LINEAR_API_KEY=${LINEAR_API_KEY}
      - SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}
      - REPORT_SCHEDULE=${REPORT_SCHEDULE:-0 9 * * 1}  # Mon 9AM
    volumes:
      - ./data:/data  # Persist SQLite database
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Data Flow

### Weekly Report Generation Flow

```
1. Cron Trigger (Monday 9 AM)
   └─> Weekly Report Job

2. Fetch Active Users
   └─> Database: SELECT * FROM users WHERE is_active = 1

3. For Each User:
   a. Check Cooldown Status
      └─> CooldownService.isInCooldown(userId, today)

   b. Fetch Linear Data
      └─> LinearClient.getWeeklyReport(linearUserId, 7 days ago)

   c. Generate Report
      └─> ReportGenerationService.format(linearData, cooldownStatus)

   d. Send to Slack
      └─> SlackClient.sendDM(slackUserId, formattedReport)

   e. Log Result
      └─> ReportsRepository.logDelivery(...)

4. Handle Errors
   └─> Retry failed deliveries (up to 3 times)
   └─> Alert admins if failures persist
```

### User Mapping Sync Flow

```
1. Cron Trigger (Daily 2 AM)
   └─> User Sync Job

2. Fetch Slack Users
   └─> SlackClient.getUsers()
   └─> Returns: [{ id, email, realName }]

3. Update Database
   └─> For each Slack user:
       └─> UsersRepository.upsert({ email, slack_user_id, slack_real_name })

4. Mark Inactive Users
   └─> Compare Slack list with database
   └─> Mark users not in Slack list as is_active = 0

5. Log Sync Results
   └─> Console: "Synced N users, marked M inactive"
```

### Cooldown Management Flow

```
1. User (via Slack command or web UI):
   POST /api/cooldown/set
   { userId, nextStart: "2025-11-03", durationWeeks: 2 }

2. API Route Handler
   └─> Validate input
   └─> Call CooldownService.updateSchedule(...)

3. CooldownService
   └─> Calculate cooldown end date
   └─> CooldownsRepository.upsert({ user_id, next_cooldown_start, duration })

4. When Generating Report:
   └─> CooldownService.isInCooldown(userId, reportDate)
       └─> SELECT * FROM cooldown_schedules
           WHERE user_id = ?
           AND next_cooldown_start <= ?
           AND DATE(next_cooldown_start, '+' || cooldown_duration_weeks || ' weeks') > ?
```

## Technology Stack

### Core
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Monorepo**: Nx

### Libraries
- **Slack SDK**: `@slack/web-api`
- **GraphQL Client**: `graphql-request` (for Linear)
- **Database**: `better-sqlite3`
- **Scheduling**: `node-cron`
- **Validation**: `zod`
- **HTTP Client**: `axios` (with retry logic)
- **Logging**: `winston`

### Development
- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript

### Deployment
- **Containerization**: Docker + Docker Compose
- **Process Management**: PM2 (inside container, optional)

## Configuration Management

### Environment Variables
```bash
# Required
SLACK_BOT_TOKEN=xoxb-...
LINEAR_API_KEY=lin_api_...
SLACK_SIGNING_SECRET=...

# Optional (with defaults)
DATABASE_PATH=/data/rundown.db
PORT=3000
NODE_ENV=production
REPORT_SCHEDULE="0 9 * * 1"  # Cron expression
LOG_LEVEL=info
```

### Runtime Configuration (Database)
Stored in `app_config` table:
- Report schedule (cron)
- Default cooldown duration
- Feature flags
- Retry policies

## Security Considerations

1. **API Keys**: Store in environment variables, never commit
2. **Slack Signature Verification**: Verify all webhook requests
3. **Database**: Not web-accessible, file permissions restricted
4. **HTTPS**: Required for Slack Event API (use reverse proxy in prod)
5. **Rate Limiting**: Implement on API routes to prevent abuse
6. **Input Validation**: Validate all user inputs with Zod schemas
7. **Error Messages**: Don't leak sensitive info in errors

## Scalability Considerations

**Current Design (MVP)**:
- Single instance
- SQLite database
- Synchronous report generation

**Future Scaling Options**:
1. **Database**: Migrate to PostgreSQL for multi-instance support
2. **Queue**: Add job queue (BullMQ) for async processing
3. **Caching**: Redis for user mappings and Linear data
4. **Horizontal Scaling**: Load balance multiple API instances
5. **Observability**: Add Prometheus metrics, Grafana dashboards

For initial version with <100 users, current design is sufficient.

## Error Handling & Resilience

1. **API Failures**:
   - Exponential backoff with retries (3 attempts)
   - Circuit breaker pattern for external APIs
   - Graceful degradation (skip user if Linear/Slack fails)

2. **Database Errors**:
   - Transaction rollback on failures
   - Migration safety checks
   - Backup strategy (daily SQLite snapshots)

3. **Delivery Failures**:
   - Log all failures to database
   - Alert on consecutive failures
   - Manual retry endpoint

4. **Monitoring**:
   - Health check endpoint
   - Delivery success rate metrics
   - Error rate tracking
   - External API latency monitoring
