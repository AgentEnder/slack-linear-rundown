# API Research Notes

## Linear GraphQL API

### Authentication
- **Personal API Keys**: `Authorization: <API_KEY>` - Best for personal tools
- **OAuth 2.0**: `Authorization: Bearer <ACCESS_TOKEN>` - Best for multi-user apps
- **Endpoint**: `https://api.linear.app/graphql`

### Rate Limits
- **API Key**: 1,500 requests/hour, 250,000 complexity points/hour
- **OAuth App**: 1,200 requests/hour, 200,000 complexity points/hour
- **Single Query Max**: 10,000 complexity points
- **Headers**: `X-RateLimit-Requests-*`, `X-Complexity`, `X-RateLimit-Complexity-*`

### Key Queries for Weekly Reports

#### Get Current User
```graphql
query Me {
  viewer {
    id
    name
    email
  }
}
```

#### Get User's ALL Assigned Issues (with optimization)
```graphql
query AllAssignedIssues($oneMonthAgo: DateTime!) {
  viewer {
    assignedIssues(
      filter: {
        # Exclude only if BOTH closed AND not updated in past month
        or: [
          { state: { type: { nin: ["completed", "canceled"] } } }
          { updatedAt: { gte: $oneMonthAgo } }
        ]
      }
      orderBy: updatedAt
    ) {
      nodes {
        id
        identifier  # e.g., "ENG-123"
        title
        description
        priority
        estimate
        createdAt
        updatedAt
        completedAt
        startedAt
        canceledAt
        state {
          id
          name
          type  # "backlog", "started", "completed", "canceled"
        }
        project {
          id
          name
        }
        team {
          id
          name
        }
      }
    }
  }
}
```

**Important**: This query fetches ALL assigned issues to the user, with one optimization:
- Issues are excluded ONLY if they are both closed (completed/canceled) AND haven't been updated in the past month
- This keeps all open issues regardless of last update
- This reduces API payload while maintaining visibility of all active work

### Important Data Structures

**Issue Fields**:
- Identifiers: `id`, `identifier`, `title`, `description`
- Timestamps: `createdAt`, `updatedAt`, `completedAt`, `startedAt`
- Properties: `priority`, `estimate`
- Relations: `assignee`, `project`, `team`, `state`

**WorkflowState Types**:
- `backlog`, `started`, `completed`, `canceled`

### Pagination
- Relay-style cursor-based
- Use `first: N, after: cursor`
- Response includes `pageInfo { hasNextPage, endCursor }`

### Best Practices
- Filter queries to only needed data
- Use webhooks instead of polling
- Specify explicit pagination limits
- Sort by `updatedAt` for incremental fetches
- Handle rate limit errors gracefully

---

## Slack API

### Authentication
- **Bot Tokens**: `xoxb-*` - Recommended (not tied to user identity)
- **User Tokens**: `xoxp-*` - Alternative (tied to workspace member)
- **Header**: `Authorization: Bearer xoxb-your-token`

### Required OAuth Scopes
- `chat:write` - Send messages
- `users:read` - List users
- `users:read.email` - Get user emails for mapping
- `conversations:write` - Open DM conversations

### Sending Direct Messages

**Two-Step Process**:
1. Open DM: `conversations.open` with `users` parameter
   - Returns channel ID starting with `D`
   - Idempotent - returns existing conversation
2. Send message: `chat.postMessage` with `channel` and `text`
   - Rate limit: ~1 message/second per channel

**Alternative**: Pass user ID directly to `chat.postMessage` for 1:1 conversations

**Scheduled Messages**:
- Use `chat.scheduleMessage` with `post_at` Unix timestamp
- Up to 120 days in advance
- Returns `scheduled_message_id` for tracking
- Can cancel with `chat.deleteScheduledMessage`

### User Mapping Strategy

**Fetch Users**:
```javascript
// users.list API call
{
  "ok": true,
  "members": [
    {
      "id": "U1234567890",
      "profile": {
        "email": "user@company.com",
        "real_name": "John Doe",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ]
}
```

**Mapping Approach**:
1. Fetch all users via `users.list` (requires `users:read` + `users:read.email`)
2. Build mapping: `email → Slack user ID`
3. Use email as common key between Linear and Slack
4. Cache mapping with periodic refresh

### Event Subscriptions (for Interactive Features)

**Setup**:
1. Enable Event Subscriptions in app settings
2. Configure public HTTPS Request URL
3. Handle URL verification challenge
4. Subscribe to event types

**URL Verification Challenge**:
```javascript
// Slack sends:
{ "type": "url_verification", "challenge": "random_string" }

// Respond with HTTP 200 and:
{ "challenge": "random_string" }
```

**Event Handling**:
- Must respond with HTTP 200 within 3 seconds
- Best practice: Acknowledge immediately, process async
- Failed deliveries retried 3 times (0s, 1min, 5min)
- Rate limit: 30,000 events per workspace per 60 minutes

### Rate Limits
- ~1 message/second per channel
- Should not be an issue for weekly reports

### Error Handling Considerations
- User not found
- DM disabled by user
- Rate limits exceeded
- Token expiration

---

## Integration Strategy

### User Identity Mapping
- **Common Key**: Email address
- **Linear**: Query `viewer.email` or `user.email`
- **Slack**: Use `users.list` with `users:read.email` scope
- **Storage**: SQLite database mapping `email ↔ slack_user_id ↔ linear_user_id`

### Scheduling Approach
Two options:
1. **External Cron/Scheduler** + `chat.postMessage` (simpler)
2. **Slack's `chat.scheduleMessage`** (native, but less flexible)

Recommendation: External scheduler (node-cron or cloud scheduler) for better control over:
- Cooldown period tracking
- Customized report generation timing
- Error retry logic

### Rate Limit Management
- Linear: 1,500 req/hr should be plenty for weekly reports
- Slack: 1 msg/sec per channel is sufficient
- Batch operations where possible
- Implement exponential backoff for rate limit errors

---

## Data Requirements

### What to Track in Database
1. **User Mappings**: `email`, `slack_user_id`, `linear_user_id`
2. **Cooldown Schedules**: `user_id`, `next_cooldown_start`, `cooldown_duration_weeks`
3. **Report Delivery Log**: `user_id`, `sent_at`, `status`, `report_data`
4. **App Configuration**: `slack_bot_token`, `linear_api_key`, `report_schedule`

### Report Content Structure

**All Reports Include**:
- **ALL open issues** assigned to the user (regardless of last update)
- Issues closed in the past month (for historical context)
- Grouped by project/team
- Cooldown status reminder
- Next cooldown date (if applicable)

**Categorization** (based on last 7 days):
- Issues completed in last 7 days
- Issues started in last 7 days
- Issues updated in last 7 days
- All other open issues (not recently touched but still assigned)

**Cooldown Mode Filtering**:
- During cooldown: Show issues that are NOT part of a project board
- Exception: Include project board issues if the board name contains "misc" or "DPE" (case-insensitive)
- Rationale: Cooldown focuses on maintenance work, tech debt, and miscellaneous items, not feature board work

**Query Strategy**:
```graphql
# Fetch ALL assigned issues (optimized)
issues = getAssignedIssues(filter: open OR (closed AND updated_in_last_month))

# Client-side filtering during cooldown:
if (inCooldown) {
  issues = issues.filter(issue =>
    !issue.project ||
    issue.project.name.toLowerCase().includes('misc') ||
    issue.project.name.toLowerCase().includes('dpe')
  )
}
