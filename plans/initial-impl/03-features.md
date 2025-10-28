# Feature Breakdown

## Core Features (MVP)

### 1. User Identity Mapping

**Description**: Map Slack users to Linear users via email addresses to enable personalized reports.

**User Stories**:
- As a system admin, I want the system to automatically sync Slack and Linear user identities so reports are sent to the correct people
- As a developer, I want my Slack account to be automatically linked to my Linear account without manual configuration

**Acceptance Criteria**:
- [ ] System fetches all Slack workspace users daily
- [ ] System stores email → Slack User ID → Linear User ID mappings
- [ ] Email is used as the common identifier between systems
- [ ] Inactive/deleted users are marked and excluded from reports
- [ ] Manual sync endpoint available for immediate updates

**Technical Requirements**:
- Database table: `users` with columns for email, slack_user_id, linear_user_id
- Slack API call: `users.list` with `users:read.email` scope
- Linear API call: `viewer` query to get current user email
- Daily cron job for automated syncing
- Handle users without matching emails gracefully

**Edge Cases**:
- User exists in Slack but not Linear (skip)
- User exists in Linear but not Slack (skip)
- Multiple users with same email (log warning, use first match)
- User changes email (re-sync on next job)
- User deactivated in one system but not the other (mark inactive)

---

### 2. Linear Data Fetching

**Description**: Query Linear's GraphQL API to fetch ALL of a user's assigned issues (open + recently closed) and project information.

**User Stories**:
- As a developer, I want to see ALL issues currently assigned to me, not just recently touched ones
- As a developer, I want to see which issues I completed, started, or updated in the last week
- As a developer, I want issues grouped by project for better organization
- As a developer, I want visibility into all open work, even if it hasn't been touched recently

**Acceptance Criteria**:
- [ ] Fetch ALL open issues assigned to the user (regardless of last update)
- [ ] Include recently closed issues (closed within past month) for historical context
- [ ] Optimize: Exclude issues that are BOTH closed AND not updated in past month
- [ ] Include issue metadata: identifier, title, state, priority, estimate
- [ ] Include related entities: project, team
- [ ] Handle pagination for users with many issues
- [ ] Categorize issues by recent activity (what happened in last 7 days)
- [ ] Respect Linear API rate limits (1,500 req/hr)

**Technical Requirements**:
- GraphQL query using `viewer.assignedIssues` with optimized filter
- Filter: `OR(state NOT IN [completed, canceled], updatedAt >= 1 month ago)`
- Fields: id, identifier, title, state{name, type}, project{name}, priority, estimate, createdAt, updatedAt, completedAt, startedAt, canceledAt
- Implement cursor-based pagination
- Client-side categorization by date ranges
- Error handling for API failures

**Data Structure**:
```typescript
interface UserReport {
  user: {
    id: string
    name: string
    email: string
  }
  periodStart: Date  // Used for categorization only
  periodEnd: Date

  // Categorized by recent activity (last 7 days)
  recentlyCompleted: LinearIssue[]
  recentlyStarted: LinearIssue[]
  recentlyUpdated: LinearIssue[]

  // All other open issues (not recently touched but still assigned)
  otherOpenIssues: LinearIssue[]

  // Grouped summary
  projectSummary: {
    projectName: string | null  // null for issues not on a project
    issueCount: number
    openCount: number
    completedCount: number
  }[]
}
```

**API Optimization Strategy**:
- Fetch all assigned issues with filter: `OR(open, updated_in_last_month)`
- This excludes only old closed issues, keeping all active work visible
- Typical savings: 50-80% reduction in payload for developers with long histories

---

### 3. Cooldown Period Tracking

**Description**: Allow developers to configure cooldown periods when they focus on non-feature work, adjusting report content accordingly.

**User Stories**:
- As a developer, I want to set my next cooldown start date and duration so the system knows when I'm in cooldown
- As a developer in cooldown, I want reports to acknowledge my cooldown status and adjust expectations
- As a developer, I want to update or cancel my cooldown schedule if plans change

**Acceptance Criteria**:
- [ ] Store cooldown schedules: next start date + duration in weeks
- [ ] Calculate if user is currently in cooldown based on today's date
- [ ] Provide API endpoint to set/update/delete cooldown schedules
- [ ] Include cooldown status in weekly reports
- [ ] Automatically calculate next cooldown end date
- [ ] Support multiple recurring cooldown periods (future enhancement)

**Technical Requirements**:
- Database table: `cooldown_schedules`
- Fields: user_id, next_cooldown_start (DATE), cooldown_duration_weeks (INT)
- API endpoints:
  - `POST /api/cooldown/set { userId, nextStart, durationWeeks }`
  - `GET /api/cooldown/:userId`
  - `PUT /api/cooldown/:userId`
  - `DELETE /api/cooldown/:userId`
- Service method: `isUserInCooldown(userId: string, date: Date): boolean`

**Calculation Logic**:
```
User is in cooldown if:
  today >= next_cooldown_start AND
  today < (next_cooldown_start + cooldown_duration_weeks)
```

**Report Adjustments During Cooldown**:
- Add banner: "🌴 You're in cooldown mode (Week 1 of 2)"
- **Filter issues to cooldown-appropriate work**:
  - Show issues NOT part of a project board
  - Exception: Include issues from projects with "misc" or "DPE" in the name (case-insensitive)
  - Rationale: Cooldown focuses on maintenance, tech debt, miscellaneous work - not feature boards
- Emphasize cooldown-appropriate work (refactoring, docs, tech debt, misc tasks)
- De-emphasize feature velocity metrics
- Show cooldown end date

**Cooldown Filtering Logic**:
```typescript
function filterForCooldown(issues: LinearIssue[]): LinearIssue[] {
  return issues.filter(issue => {
    // Include if no project (unboarded work)
    if (!issue.project) return true

    // Include if project name contains 'misc' or 'dpe' (case-insensitive)
    const projectName = issue.project.name.toLowerCase()
    if (projectName.includes('misc') || projectName.includes('dpe')) {
      return true
    }

    // Exclude all other project board issues
    return false
  })
}
```

---

### 4. Weekly Report Generation

**Description**: Generate personalized weekly status reports showing ALL assigned issues with recent activity highlighted, adjusted for cooldown context.

**User Stories**:
- As a developer, I want to receive a summary of my week's work every Monday morning
- As a developer, I want to see ALL my open issues, not just recently touched ones
- As a developer, I want recent activity (completed, started, updated) clearly highlighted
- As a developer, I want visibility into stale issues that need attention
- As a developer in cooldown, I want the report to show only cooldown-appropriate work

**Acceptance Criteria**:
- [ ] Generate reports for all active users
- [ ] Show ALL open issues assigned to the user
- [ ] Categorize by recent activity: Completed (last 7 days), Started (last 7 days), Updated (last 7 days)
- [ ] Show other open issues not recently touched (potential blockers or forgotten work)
- [ ] Apply cooldown filtering if user is in cooldown (no project board issues except misc/DPE)
- [ ] Group issues by project for organization
- [ ] Show issue counts and key metrics
- [ ] Include cooldown status if applicable
- [ ] Format report in clear, scannable structure
- [ ] Handle users with no issues (send minimal summary)

**Technical Requirements**:
- Service: `ReportGenerationService`
- Input: Linear data, cooldown status
- Output: Structured report object
- Formatting: Plain text with optional Slack Block Kit (Phase 2)

**Report Structure**:
```
Good morning, [Name]! Here's your rundown.

[Cooldown Banner if applicable - only shown during cooldown]
🌴 You're in cooldown mode (Week 1 of 2)
Focus: Maintenance, tech debt, and miscellaneous work
Ends: Nov 10

📊 Summary:
• Total open issues: 12
• Completed this week: 5
• Started this week: 2
• Updated this week: 3
• Not recently touched: 7

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

  No Project:
  • ENG-175: Performance optimization (last updated Fri)

📋 Other Open Issues (not recently touched):
  Project: Backend API
  • ENG-190: Database index optimization (last updated Oct 15)
  • ENG-195: Add monitoring dashboards (last updated Oct 10)

  Project: Misc Tasks
  • ENG-200: Update team documentation (last updated Oct 12)

  No Project:
  • ENG-205: Tech debt: Refactor auth module (last updated Oct 8)
  • ENG-210: Fix flaky test suite (last updated Oct 5)
  • ENG-215: Update dependencies (last updated Sep 28)
  • ENG-220: Code review backlog (last updated Sep 25)

[Next cooldown: Nov 3 (2 weeks) - only shown when NOT in cooldown]
```

**Note**: During cooldown, only the "No Project" and "Misc Tasks"/"DPE" project issues would be shown.

---

### 5. Slack Direct Message Delivery

**Description**: Send personalized weekly reports to developers via Slack direct messages.

**User Stories**:
- As a developer, I want to receive my weekly report via Slack DM every Monday at 9 AM
- As a developer, I want the report to be easy to read and not disruptive
- As a system admin, I want delivery failures to be logged and retried

**Acceptance Criteria**:
- [ ] Send DMs to all active users
- [ ] Respect Slack rate limits (~1 msg/sec per channel)
- [ ] Handle delivery failures gracefully
- [ ] Log all delivery attempts (success/failure)
- [ ] Retry failed deliveries (up to 3 times)
- [ ] Skip users who have disabled DMs from bots

**Technical Requirements**:
- Slack API: `chat.postMessage` with user ID as channel
- Service: `ReportDeliveryService`
- Error handling:
  - `channel_not_found`: Log and skip user
  - `not_in_channel`: Log and skip user
  - Rate limit errors: Implement exponential backoff
  - Network errors: Retry with backoff
- Delivery logging: Store status in `report_delivery_log` table

**Delivery Flow**:
```
1. For each user:
   a. Get Slack user ID from database
   b. Format report as Slack message
   c. Call chat.postMessage
   d. Log result (success/failure)
   e. If failure: retry up to 3 times with backoff
   f. Continue to next user
2. Generate delivery summary report
```

---

### 6. Scheduled Report Job

**Description**: Automatically trigger weekly report generation and delivery on a schedule.

**User Stories**:
- As a developer, I want reports sent automatically every Monday at 9 AM without manual intervention
- As a system admin, I want to configure the schedule via environment variables
- As a system admin, I want to see logs of each scheduled run

**Acceptance Criteria**:
- [ ] Default schedule: Mondays at 9:00 AM
- [ ] Schedule configurable via environment variable (cron expression)
- [ ] Job runs automatically without manual trigger
- [ ] Logs start/end time and results
- [ ] Handles errors without crashing
- [ ] Can be manually triggered via API endpoint for testing

**Technical Requirements**:
- Library: `node-cron`
- Environment variable: `REPORT_SCHEDULE` (default: `"0 9 * * 1"`)
- Job file: `apps/api/src/app/jobs/weekly-report.job.ts`
- Manual trigger: `POST /api/trigger-report`

**Job Implementation**:
```typescript
cron.schedule(process.env.REPORT_SCHEDULE, async () => {
  console.log('Starting weekly report job...')

  try {
    // 1. Get all active users
    const users = await usersRepo.getActive()

    // 2. For each user, generate and send report
    for (const user of users) {
      await generateAndSendReport(user)
    }

    console.log(`Report job complete: ${users.length} reports sent`)
  } catch (error) {
    console.error('Report job failed:', error)
    // Alert admins
  }
})
```

---

### 7. Health Check & Monitoring

**Description**: Provide observability into system health and external dependencies.

**User Stories**:
- As a system admin, I want to check if the system is healthy
- As a system admin, I want to know if Slack or Linear APIs are reachable
- As a system admin, I want to monitor delivery success rates

**Acceptance Criteria**:
- [ ] Health check endpoint returns 200 when healthy
- [ ] Check database connectivity
- [ ] Check Slack API connectivity (optional)
- [ ] Check Linear API connectivity (optional)
- [ ] Return status JSON with component health

**Technical Requirements**:
- Endpoint: `GET /api/health`
- Response format:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-27T12:00:00Z",
  "components": {
    "database": "healthy",
    "slack": "healthy",
    "linear": "healthy"
  },
  "version": "1.0.0"
}
```

**Health Checks**:
- Database: Execute simple query (`SELECT 1`)
- Slack: Optional ping (may count against rate limit)
- Linear: Optional ping (may count against rate limit)

---

## Phase 2 Features (Future Enhancements)

### 8. Interactive Slack Commands

**Description**: Allow users to manage their settings directly from Slack.

**User Stories**:
- As a developer, I want to type `/cooldown set 2025-11-03 2w` in Slack to set my cooldown
- As a developer, I want to type `/report trigger` to immediately receive my weekly report
- As a developer, I want to type `/cooldown status` to check my current cooldown schedule

**Slash Commands**:
- `/rundown cooldown set <date> <duration>` - Set cooldown schedule
- `/rundown cooldown status` - View current cooldown
- `/rundown cooldown clear` - Cancel cooldown
- `/rundown report` - Trigger immediate report
- `/rundown help` - Show available commands

**Technical Requirements**:
- Enable Slash Commands in Slack app settings
- Add route: `POST /slack/commands`
- Parse command text and route to appropriate handler
- Respond with ephemeral messages (visible only to user)

---

### 9. Rich Message Formatting (Slack Block Kit)

**Description**: Enhance report readability with Slack's Block Kit UI components.

**Features**:
- Collapsible sections for each project
- Color-coded issue priorities
- Inline links to Linear issues
- Action buttons (e.g., "View in Linear")
- Progress bars for issue completion

**Example Block Structure**:
```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "📊 Your Week in Review" }
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*Oct 20-27*\n5 completed • 2 started • 3 updated" }
    },
    {
      "type": "divider"
    },
    {
      "type": "section",
      "text": { "type": "mrkdwn", "text": "*✅ Completed*\n• <https://linear.app/issue/ENG-123|ENG-123>: Implement auth\n• <https://linear.app/issue/ENG-145|ENG-145>: Add rate limiting" }
    }
  ]
}
```

---

### 10. Recurring Cooldown Schedules

**Description**: Support automatically recurring cooldown periods (e.g., every 6 weeks).

**Features**:
- Set cooldown interval (e.g., "2 weeks of cooldown every 6 weeks")
- Automatically calculate next cooldown after current one ends
- View upcoming cooldown schedule
- Pause recurring schedule temporarily

**Database Schema Update**:
```sql
ALTER TABLE cooldown_schedules ADD COLUMN is_recurring BOOLEAN DEFAULT 0;
ALTER TABLE cooldown_schedules ADD COLUMN recurrence_interval_weeks INTEGER;
```

---

### 11. Team-Level Reports

**Description**: Send aggregated team reports to team leads or channels.

**User Stories**:
- As a team lead, I want to see a summary of my team's weekly activity
- As a team lead, I want to know who's in cooldown and who's actively working on features

**Features**:
- Aggregate individual reports by team
- Show team-level metrics (total issues completed, avg velocity)
- Identify blockers or stuck issues
- Post to team channel instead of DMs

---

### 12. Customizable Report Content

**Description**: Allow users to configure what appears in their reports.

**Settings**:
- Include/exclude issue descriptions
- Show only specific issue states (e.g., only completed)
- Filter by project or team
- Adjust time window (e.g., last 14 days instead of 7)
- Choose report frequency (weekly, bi-weekly, monthly)

---

### 13. Analytics Dashboard

**Description**: Web dashboard for viewing historical reports and trends.

**Features**:
- View past reports
- Charts: Issues completed over time, velocity trends
- Cooldown history
- Delivery success rates
- Team comparisons

**Tech Stack**:
- Frontend: React (Nx app)
- Charts: Chart.js or Recharts
- API: Extend Express server with data endpoints

---

### 14. Multi-Workspace Support

**Description**: Support multiple Slack workspaces and Linear organizations.

**Use Case**: Agencies or consultancies working with multiple clients.

**Requirements**:
- Store workspace/org IDs in database
- Multi-tenant data isolation
- Per-workspace configuration
- Separate bot tokens per workspace

---

### 15. Webhook Integrations

**Description**: React to real-time events from Linear via webhooks.

**Use Cases**:
- Notify user in Slack when assigned a new issue
- Alert when issue is blocked or at risk
- Celebrate when issue is completed

**Technical Requirements**:
- Add route: `POST /webhooks/linear`
- Verify webhook signatures
- Process events asynchronously
- Store webhook delivery logs

---

## Feature Priority Matrix

| Feature | Priority | Complexity | Value |
|---------|----------|------------|-------|
| 1. User Identity Mapping | P0 (MVP) | Medium | High |
| 2. Linear Data Fetching | P0 (MVP) | Medium | High |
| 3. Cooldown Period Tracking | P0 (MVP) | Low | High |
| 4. Weekly Report Generation | P0 (MVP) | Medium | High |
| 5. Slack DM Delivery | P0 (MVP) | Low | High |
| 6. Scheduled Report Job | P0 (MVP) | Low | High |
| 7. Health Check | P0 (MVP) | Low | Medium |
| 8. Interactive Slack Commands | P1 | Medium | High |
| 9. Rich Message Formatting | P1 | Low | Medium |
| 10. Recurring Cooldown Schedules | P2 | Medium | Medium |
| 11. Team-Level Reports | P2 | High | Medium |
| 12. Customizable Report Content | P2 | Medium | Medium |
| 13. Analytics Dashboard | P3 | High | Low |
| 14. Multi-Workspace Support | P3 | High | Low |
| 15. Webhook Integrations | P3 | Medium | Medium |

**Priority Levels**:
- **P0 (MVP)**: Must have for initial release
- **P1**: High value, plan for v1.1
- **P2**: Nice to have, plan for v1.2+
- **P3**: Future consideration

---

## Non-Functional Requirements

### Performance
- Report generation: <2 seconds per user
- Slack delivery: <1 second per message
- API response time: <500ms for all endpoints
- Database queries: <100ms

### Reliability
- 99% uptime for scheduled jobs
- 95%+ delivery success rate
- Automatic retries for transient failures
- Graceful degradation on external API failures

### Security
- Environment variables for secrets
- Slack signature verification on all webhooks
- SQL injection prevention (parameterized queries)
- Rate limiting on API endpoints

### Scalability
- Support up to 100 users (MVP)
- Support up to 1,000 users (v1.1 with PostgreSQL)
- Horizontal scaling possible (stateless API)

### Observability
- Structured logging (JSON format)
- Error tracking (console logs, future: Sentry)
- Delivery metrics (success/failure rates)
- API latency tracking

### Maintainability
- TypeScript strict mode
- 80%+ test coverage (unit + integration)
- Comprehensive README and documentation
- Clear separation of concerns (libraries + app)
