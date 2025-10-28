# Implementation Roadmap

## Overview

This document outlines the step-by-step implementation plan for the Slack-Linear Rundown system. The plan is organized into phases, with each phase containing specific tasks that build upon the previous ones.

## Phase 0: Project Setup & Infrastructure

**Goal**: Set up the Nx workspace, libraries, and development environment.

**Estimated Time**: 2-3 days

### Tasks

#### 0.1 Configure Nx Workspace Structure
- [ ] Create library: `@slack-linear-rundown/database`
  - Command: `nx g @nx/js:lib libs/database --publishable=false`
  - Add dependencies: `better-sqlite3`, `@types/better-sqlite3`
- [ ] Create library: `@slack-linear-rundown/linear`
  - Command: `nx g @nx/js:lib libs/linear --publishable=false`
  - Add dependencies: `graphql-request`, `graphql`
- [ ] Create library: `@slack-linear-rundown/slack`
  - Command: `nx g @nx/js:lib libs/slack --publishable=false`
  - Add dependencies: `@slack/web-api`
- [ ] Create application: `api`
  - Command: `nx g @nx/node:application apps/api`
  - Add dependencies: `express`, `@types/express`, `node-cron`, `@types/node-cron`, `dotenv`, `zod`, `winston`

**Deliverables**:
- Nx workspace with 3 libraries and 1 application
- All dependencies installed
- Basic TypeScript configuration

---

#### 0.2 Database Library - Schema & Migrations
- [ ] Create database schema file: `libs/database/src/lib/schema.ts`
  - Define table schemas (users, cooldown_schedules, report_delivery_log, app_config)
- [ ] Create migration system: `libs/database/src/lib/migrations/`
  - `001_initial_schema.sql` - Create all tables
- [ ] Create database connection manager: `libs/database/src/lib/db.ts`
  - Initialize SQLite connection
  - Run migrations on startup
  - Export database instance
- [ ] Create repositories:
  - `libs/database/src/lib/repositories/users.repository.ts`
  - `libs/database/src/lib/repositories/cooldowns.repository.ts`
  - `libs/database/src/lib/repositories/reports.repository.ts`
  - `libs/database/src/lib/repositories/config.repository.ts`
- [ ] Export all from `libs/database/src/index.ts`

**Testing**:
- Unit tests for each repository (CRUD operations)
- Integration test: Full database lifecycle (create, migrate, query, cleanup)

**Deliverables**:
- Working database library with all repositories
- Migration system functional
- 80%+ test coverage

---

#### 0.3 Linear Library - GraphQL Client
- [ ] Create Linear client: `libs/linear/src/lib/linear-client.ts`
  - Initialize GraphQL client with API key
  - Handle authentication headers
  - Implement error handling and retries
- [ ] Create GraphQL queries: `libs/linear/src/lib/queries.ts`
  - `getCurrentUser` - Get viewer info
  - `getAssignedIssues` - Get issues with filters
  - `getWeeklyReport` - Get comprehensive weekly data
- [ ] Create TypeScript types: `libs/linear/src/lib/types.ts`
  - `LinearUser`, `LinearIssue`, `LinearProject`, `WeeklyReport`
- [ ] Implement pagination helper for large result sets
- [ ] Add rate limit handling (exponential backoff)
- [ ] Export all from `libs/linear/src/index.ts`

**Testing**:
- Mock GraphQL responses for unit tests
- Integration test with real Linear API (optional, use test account)
- Test rate limit handling

**Deliverables**:
- Working Linear client library
- All queries implemented and tested
- 80%+ test coverage

---

#### 0.4 Slack Library - Web API Client
- [ ] Create Slack client: `libs/slack/src/lib/slack-client.ts`
  - Initialize with bot token
  - Implement `sendDM(userId, message)`
  - Implement `getUsers()`
  - Implement `scheduleMessage()` (optional for MVP)
- [ ] Create message formatters: `libs/slack/src/lib/formatters.ts`
  - `formatWeeklyReport()` - Convert report to Slack message
  - `formatCooldownBanner()` - Format cooldown status
- [ ] Create TypeScript types: `libs/slack/src/lib/types.ts`
  - `SlackUser`, `SlackMessage`, `SlackDeliveryResult`
- [ ] Implement rate limiting (queue-based, 1 msg/sec)
- [ ] Add error handling for common Slack API errors
- [ ] Export all from `libs/slack/src/index.ts`

**Testing**:
- Mock Slack API responses for unit tests
- Integration test with real Slack workspace (test channel)
- Test rate limiting behavior

**Deliverables**:
- Working Slack client library
- Message formatting utilities
- 80%+ test coverage

---

#### 0.5 Docker & Environment Configuration
- [ ] Create `Dockerfile` for API application
  - Multi-stage build (build + production)
  - Install dependencies
  - Build Nx application
  - Set up non-root user
- [ ] Create `docker-compose.yml`
  - Define API service
  - Mount volume for SQLite database
  - Environment variable configuration
  - Health check configuration
- [ ] Create `.env.example` file with all required variables
- [ ] Create `.dockerignore` to exclude unnecessary files
- [ ] Document environment variables in README

**Testing**:
- Build Docker image successfully
- Run container and verify health
- Test volume persistence (database survives restart)

**Deliverables**:
- Working Docker setup
- Docker Compose configuration
- Environment variable documentation

---

## Phase 1: Core Application & Services

**Goal**: Build the Express API application and core business logic services.

**Estimated Time**: 4-5 days

### Tasks

#### 1.1 Express Application Setup
- [ ] Set up Express server: `apps/api/src/main.ts`
  - Initialize Express app
  - Add middleware: JSON parser, CORS, error handler
  - Add logging (Winston)
  - Load environment variables
  - Start server on configured port
- [ ] Create environment config: `apps/api/src/environment/environment.ts`
  - Validate required env vars with Zod
  - Export typed configuration object
- [ ] Create global error handler middleware
- [ ] Create request logging middleware
- [ ] Add health check route: `GET /api/health`

**Testing**:
- Test server starts successfully
- Test health check endpoint returns 200
- Test error handling middleware

**Deliverables**:
- Running Express server
- Basic middleware configured
- Health check functional

---

#### 1.2 Database Integration
- [ ] Initialize database on app startup: `apps/api/src/main.ts`
  - Import database from `@slack-linear-rundown/database`
  - Run migrations
  - Verify connection
- [ ] Create database initialization script
- [ ] Add database health check to `/api/health` endpoint

**Testing**:
- Test database initializes on startup
- Test migrations run successfully
- Test health check includes database status

**Deliverables**:
- Database integrated with API app
- Migrations run automatically
- Health check updated

---

#### 1.3 User Mapping Service
- [ ] Create service: `apps/api/src/app/services/user-mapping.service.ts`
  - `syncSlackUsers()` - Fetch and store Slack users
  - `syncLinearUsers()` - Map Linear users by email (future)
  - `getUserByEmail(email)` - Lookup user
  - `markInactiveUsers()` - Mark users not in Slack
- [ ] Implement sync logic:
  - Fetch all users from Slack (`SlackClient.getUsers()`)
  - Upsert into database (email, slack_user_id, slack_real_name)
  - Mark users not in Slack response as inactive
- [ ] Add error handling and logging

**Testing**:
- Unit tests with mocked Slack API
- Integration test with test database
- Test inactive user marking

**Deliverables**:
- User mapping service functional
- Sync logic implemented
- Tests passing

---

#### 1.4 Cooldown Service
- [ ] Create service: `apps/api/src/app/services/cooldown.service.ts`
  - `isUserInCooldown(userId, date)` - Check cooldown status
  - `getCooldownSchedule(userId)` - Get user's schedule
  - `updateCooldownSchedule(userId, nextStart, duration)` - Set schedule
  - `deleteCooldownSchedule(userId)` - Remove schedule
- [ ] Implement cooldown calculation logic
- [ ] Add validation (dates, duration > 0, etc.)
- [ ] Add error handling

**Testing**:
- Unit tests for date calculations
- Test edge cases (past dates, negative durations)
- Integration tests with database

**Deliverables**:
- Cooldown service functional
- All CRUD operations working
- Tests passing

---

#### 1.5 Report Generation Service
- [ ] Create service: `apps/api/src/app/services/report-generation.service.ts`
  - `generateReportForUser(userId)` - Main entry point
  - `fetchLinearData(linearUserId)` - Get issues from Linear
  - `categorizeIssues(issues)` - Group by state
  - `formatReport(data, cooldownStatus)` - Create report text
- [ ] Implement Linear data fetching:
  - Get user from database
  - Call `LinearClient.getWeeklyReport()`
  - Handle pagination if needed
- [ ] Implement issue categorization:
  - Completed: `state.type === "completed"`
  - Started: Issue created in last 7 days
  - In Progress: `state.type === "started"`
  - Updated: All others updated in period
- [ ] Implement report formatting (plain text for MVP)
- [ ] Add cooldown banner if user in cooldown
- [ ] Add error handling and logging

**Testing**:
- Unit tests with mock Linear data
- Test categorization logic
- Test report formatting output
- Integration test with real Linear API (optional)

**Deliverables**:
- Report generation service functional
- Reports formatted correctly
- Tests passing

---

#### 1.6 Report Delivery Service
- [ ] Create service: `apps/api/src/app/services/report-delivery.service.ts`
  - `deliverReport(userId, reportText)` - Send via Slack
  - `deliverReportToAll()` - Send to all active users
  - `retryFailedDelivery(logId)` - Retry mechanism
- [ ] Implement Slack delivery:
  - Get Slack user ID from database
  - Format message using `SlackClient`
  - Send DM
  - Log result to database
- [ ] Implement retry logic (exponential backoff, max 3 attempts)
- [ ] Handle Slack API errors gracefully
- [ ] Add delivery logging to `report_delivery_log` table

**Testing**:
- Unit tests with mocked Slack API
- Test retry logic
- Test error handling (user not found, DM disabled, etc.)
- Integration test with test Slack workspace

**Deliverables**:
- Report delivery service functional
- Retry logic working
- Delivery logging implemented
- Tests passing

---

## Phase 2: API Routes & Endpoints

**Goal**: Expose HTTP endpoints for managing the system and triggering operations.

**Estimated Time**: 2-3 days

### Tasks

#### 2.1 Health Check Route
- [ ] Create route: `apps/api/src/app/routes/health.routes.ts`
  - `GET /api/health` - Full health check
- [ ] Implement health check logic:
  - Check database connectivity (SELECT 1)
  - Check Slack API (optional ping)
  - Check Linear API (optional ping)
  - Return JSON with component statuses
- [ ] Register route in main app

**Testing**:
- Test health endpoint returns 200 when healthy
- Test health endpoint returns 503 when unhealthy
- Test individual component checks

**Deliverables**:
- Health check route implemented
- Component health checks working
- Tests passing

---

#### 2.2 Cooldown Management Routes
- [ ] Create route: `apps/api/src/app/routes/cooldown.routes.ts`
  - `POST /api/cooldown/set` - Set cooldown schedule
  - `GET /api/cooldown/:userId` - Get cooldown schedule
  - `PUT /api/cooldown/:userId` - Update cooldown schedule
  - `DELETE /api/cooldown/:userId` - Delete cooldown schedule
- [ ] Implement request validation using Zod schemas
- [ ] Call `CooldownService` methods
- [ ] Return appropriate HTTP status codes
- [ ] Add error handling
- [ ] Register routes in main app

**Testing**:
- Test all CRUD operations
- Test validation errors (400)
- Test not found errors (404)
- Test success responses (200, 201)

**Deliverables**:
- Cooldown routes implemented
- Validation working
- Tests passing

---

#### 2.3 Manual Report Trigger Route
- [ ] Create route: `apps/api/src/app/routes/report.routes.ts`
  - `POST /api/trigger-report` - Trigger reports manually
  - Optional body: `{ userId?: string }` (if not provided, send to all)
- [ ] Implement trigger logic:
  - If userId provided: Generate and send for that user
  - If no userId: Generate and send for all active users
- [ ] Return summary of deliveries (success count, failure count)
- [ ] Add rate limiting to prevent abuse
- [ ] Register route in main app

**Testing**:
- Test single user report trigger
- Test all users report trigger
- Test with invalid user ID (404)
- Test response format

**Deliverables**:
- Manual trigger route implemented
- Works for single and all users
- Tests passing

---

#### 2.4 Slack Event Handling Route (Foundation)
- [ ] Create route: `apps/api/src/app/routes/slack.routes.ts`
  - `POST /slack/events` - Handle Slack Event API
- [ ] Implement URL verification challenge handler:
  - If `type === "url_verification"`, respond with challenge
- [ ] Add placeholder for event callback handling (Phase 3)
- [ ] Implement Slack signature verification middleware
- [ ] Register route in main app

**Testing**:
- Test URL verification challenge
- Test signature verification (valid and invalid)
- Test responds within 3 seconds

**Deliverables**:
- Slack event route setup
- URL verification working
- Signature verification implemented

---

## Phase 3: Scheduled Jobs & Automation

**Goal**: Implement automated weekly report generation and user syncing.

**Estimated Time**: 2-3 days

### Tasks

#### 3.1 Weekly Report Scheduled Job
- [ ] Create job: `apps/api/src/app/jobs/weekly-report.job.ts`
- [ ] Implement job logic:
  - Get all active users from database
  - For each user:
    - Generate report using `ReportGenerationService`
    - Deliver using `ReportDeliveryService`
    - Log result
  - Generate summary (total sent, failures)
  - Log summary
- [ ] Set up cron schedule from environment variable
- [ ] Add error handling (continue on individual failures)
- [ ] Initialize job in `main.ts`

**Testing**:
- Test job executes successfully
- Test handles individual user failures gracefully
- Test with multiple users
- Manual trigger via cron for testing

**Deliverables**:
- Weekly report job implemented
- Scheduled execution working
- Error handling robust

---

#### 3.2 User Sync Scheduled Job
- [ ] Create job: `apps/api/src/app/jobs/user-sync.job.ts`
- [ ] Implement job logic:
  - Call `UserMappingService.syncSlackUsers()`
  - Log sync results (users synced, users marked inactive)
- [ ] Set up daily cron schedule (e.g., 2:00 AM)
- [ ] Add error handling
- [ ] Initialize job in `main.ts`

**Testing**:
- Test job executes successfully
- Test users are synced correctly
- Test inactive user marking
- Manual trigger for testing

**Deliverables**:
- User sync job implemented
- Scheduled execution working
- Tests passing

---

#### 3.3 Job Monitoring & Logging
- [ ] Add structured logging to all jobs (Winston)
- [ ] Log job start/end times
- [ ] Log individual operation results
- [ ] Log errors with stack traces
- [ ] Add job execution metrics (duration, success rate)

**Testing**:
- Verify logs are structured (JSON)
- Test log levels (info, warn, error)
- Test logs include timestamps and context

**Deliverables**:
- Comprehensive job logging
- Structured log format
- Job metrics captured

---

## Phase 4: Testing & Quality Assurance

**Goal**: Ensure code quality, test coverage, and system reliability.

**Estimated Time**: 2-3 days

### Tasks

#### 4.1 Unit Testing
- [ ] Achieve 80%+ code coverage for all libraries
- [ ] Achieve 80%+ code coverage for API services
- [ ] Write tests for all edge cases
- [ ] Use test fixtures for consistent test data
- [ ] Mock external APIs (Slack, Linear)

**Deliverables**:
- 80%+ test coverage
- All unit tests passing
- Test suite runs in <30 seconds

---

#### 4.2 Integration Testing
- [ ] Test database operations end-to-end
- [ ] Test Slack API integration (with test workspace)
- [ ] Test Linear API integration (with test account)
- [ ] Test full report generation + delivery flow
- [ ] Test scheduled jobs execution

**Deliverables**:
- Integration test suite created
- All integration tests passing
- Documented test setup process

---

#### 4.3 Error Handling & Edge Cases
- [ ] Test API failures (Slack, Linear unreachable)
- [ ] Test database failures (connection lost, disk full)
- [ ] Test invalid data (malformed responses)
- [ ] Test rate limiting scenarios
- [ ] Test concurrent request handling
- [ ] Verify graceful degradation

**Deliverables**:
- Robust error handling verified
- Edge cases covered
- No unhandled exceptions

---

#### 4.4 Code Quality & Linting
- [ ] Configure ESLint with strict rules
- [ ] Configure Prettier for consistent formatting
- [ ] Run linter and fix all warnings
- [ ] Enable TypeScript strict mode
- [ ] Fix all type errors
- [ ] Add pre-commit hooks (husky)

**Deliverables**:
- Zero linting errors
- Code formatted consistently
- TypeScript strict mode enabled
- Pre-commit hooks configured

---

## Phase 5: Documentation & Deployment

**Goal**: Complete documentation and prepare for production deployment.

**Estimated Time**: 2-3 days

### Tasks

#### 5.1 README Documentation
- [ ] Update main README with:
  - Project overview and purpose
  - Architecture diagram
  - Setup instructions
  - Environment variable reference
  - Docker setup guide
  - Development workflow
  - API endpoint documentation
  - Troubleshooting guide

**Deliverables**:
- Comprehensive README
- Clear setup instructions
- API documentation

---

#### 5.2 Slack App Configuration Guide
- [ ] Document how to create Slack app
- [ ] List required OAuth scopes
- [ ] Document Event Subscriptions setup
- [ ] Document Request URL configuration
- [ ] Provide screenshots for each step

**Deliverables**:
- Slack app setup guide
- Screenshots included
- Clear step-by-step instructions

---

#### 5.3 Linear API Configuration Guide
- [ ] Document how to obtain Linear API key
- [ ] Document required permissions
- [ ] Provide setup screenshots

**Deliverables**:
- Linear API setup guide
- Permission requirements documented

---

#### 5.4 Deployment Guide
- [ ] Document Docker Compose deployment
- [ ] Document environment variable setup
- [ ] Document volume management (database backups)
- [ ] Document how to update the application
- [ ] Document monitoring and logs access
- [ ] Provide production checklist

**Deliverables**:
- Deployment guide complete
- Production checklist
- Maintenance documentation

---

#### 5.5 Initial Deployment & Testing
- [ ] Deploy to staging/test environment
- [ ] Verify all services start successfully
- [ ] Run full end-to-end test
- [ ] Verify scheduled jobs execute
- [ ] Test with real users (limited group)
- [ ] Collect feedback
- [ ] Fix any deployment issues

**Deliverables**:
- Application deployed successfully
- End-to-end tests passing in production
- User feedback collected

---

## Timeline Summary

| Phase | Duration | Parallel Work Possible |
|-------|----------|------------------------|
| Phase 0: Project Setup | 2-3 days | Libraries can be built in parallel (0.3, 0.4) |
| Phase 1: Core Services | 4-5 days | Services can be built in parallel after 1.1-1.2 |
| Phase 2: API Routes | 2-3 days | Routes can be built in parallel |
| Phase 3: Scheduled Jobs | 2-3 days | Jobs can be built in parallel |
| Phase 4: Testing & QA | 2-3 days | Different test types in parallel |
| Phase 5: Documentation | 2-3 days | Documentation can be written in parallel |

**Total Estimated Time**: 14-20 days (2-4 weeks)

With parallel development (e.g., 2-3 developers):
- **Optimistic**: 10-12 days
- **Realistic**: 14-18 days

---

## Development Order & Dependencies

### Critical Path
```
0.1 Workspace Setup
  ↓
0.2 Database Library
  ↓
1.1 Express Setup
  ↓
1.2 Database Integration
  ↓
[Services can be built in parallel]
  ↓
[Routes can be built in parallel]
  ↓
3.1 Weekly Report Job
  ↓
4.x Testing
  ↓
5.x Documentation & Deployment
```

### Parallel Tracks
- **Track A**: Database Library (0.2) → User Mapping Service (1.3) → User Sync Job (3.2)
- **Track B**: Linear Library (0.3) → Report Generation Service (1.5) → Weekly Report Job (3.1)
- **Track C**: Slack Library (0.4) → Report Delivery Service (1.6) → Weekly Report Job (3.1)
- **Track D**: Cooldown Service (1.4) → Cooldown Routes (2.2)

---

## Risk Mitigation

### Technical Risks
1. **External API Rate Limits**
   - Mitigation: Implement exponential backoff, cache where possible
   - Fallback: Queue requests and process slowly

2. **Database Corruption**
   - Mitigation: Daily backups, WAL mode for SQLite
   - Fallback: Restore from backup

3. **Slack/Linear API Changes**
   - Mitigation: Pin SDK versions, monitor changelogs
   - Fallback: Update SDKs and adjust code

4. **Docker Environment Issues**
   - Mitigation: Test on multiple platforms (Mac, Linux)
   - Fallback: Provide non-Docker deployment guide

### Project Risks
1. **Scope Creep**
   - Mitigation: Stick to MVP features (P0 only)
   - Defer Phase 2 features to v1.1

2. **Timeline Delays**
   - Mitigation: Build in buffer time (20% extra)
   - Re-prioritize if needed

---

## Success Criteria

The MVP is considered complete when:
- [ ] All Phase 0-3 tasks completed
- [ ] 80%+ test coverage achieved
- [ ] All integration tests passing
- [ ] Docker deployment working
- [ ] Documentation complete
- [ ] End-to-end test with real users successful
- [ ] Weekly reports delivered automatically
- [ ] Zero critical bugs in production

---

## Next Steps After MVP

1. Collect user feedback (2 weeks)
2. Prioritize Phase 2 features based on feedback
3. Implement P1 features (Interactive Slack Commands, Rich Formatting)
4. Consider scaling improvements (PostgreSQL, Redis)
5. Add analytics and monitoring
6. Plan v2.0 with team-level features
