# GitHub Integration - Implementation Progress

**Last Updated:** 2025-10-28
**Status:** ✅ COMPLETE - All Core Features Implemented and Ready for Testing

## Overview

This document tracks the implementation of GitHub integration for the Slack-Linear Rundown application. The goal is to add GitHub as a data source alongside Linear, sync PR/issue data to the database (not hitting APIs on every request), and enhance weekly reports with development activity.

## Key Objectives

1. ✅ **Sync data to database** - Don't hit GitHub API on every user app visit
2. ✅ **Track sync timestamps** - Show data freshness in admin & user apps
3. ✅ **Correlate Linear ↔ GitHub** - Link PRs to Linear issues
4. ✅ **Integrate into weekly reports** - GitHub data now synced during report generation
5. ⏸️ **Enhanced report format** - New structure (deferred - can be separate PR)
6. ⏸️ **User app improvements** - Dashboard with metrics (deferred - can be separate PR)

## Completed Work

### ✅ Phase 1a: Database Schema (100%)

**Migration:** `libs/database/src/migrations/005-add-github-integration.ts`

Created 7 new tables:

1. **Repository** - GitHub repositories user contributes to
   - Fields: github_id, owner, name, full_name, url, is_private, is_fork, is_archived
   - Tracks: first_synced_at, last_synced_at

2. **GitHubPullRequest** - Pull request data and stats
   - Fields: github_id, repository_id, number, title, body, state, is_draft, is_merged
   - Author: author_github_login, author_github_id
   - Branches: head_ref, base_ref
   - Stats: additions, deletions, changed_files
   - Timestamps: created_at, updated_at, merged_at, closed_at

3. **GitHubIssue** - GitHub issue data
   - Fields: github_id, repository_id, number, title, body, state, state_reason
   - Assignment: author, assignee
   - Labels: JSON array of label names
   - Timestamps: created_at, updated_at, closed_at

4. **GitHubCodeReview** - Reviews given by users
   - Fields: github_id, pr_id, reviewer_github_login, state, body
   - State: APPROVED, CHANGES_REQUESTED, COMMENTED, DISMISSED
   - Timestamp: submitted_at

5. **UserGitHubSnapshot** - Historical snapshots for reports (mirrors UserIssueSnapshot pattern)
   - Links: user_id, github_pr_id, github_issue_id, github_review_id
   - Metadata: snapshot_date, report_period_start/end, category
   - Snapshot values: state_snapshot, is_merged_snapshot, additions_snapshot, deletions_snapshot

6. **IssueGitHubLink** - Correlates Linear issues with GitHub work
   - Links: issue_id (Linear), github_pr_id, github_issue_id
   - Detection: link_type (linear_attachment, pr_title, pr_body, branch_name, manual)
   - Confidence: high, medium, low
   - Pattern: detection_pattern (e.g., "ENG-123")

7. **Extended User table** with:
   - `github_username` (indexed)
   - `github_user_id` (indexed)

**Models Created:**
- `libs/database/src/lib/models/Repository.model.ts`
- `libs/database/src/lib/models/GitHubPullRequest.model.ts`
- `libs/database/src/lib/models/GitHubIssue.model.ts`
- `libs/database/src/lib/models/GitHubCodeReview.model.ts`
- `libs/database/src/lib/models/UserGitHubSnapshot.model.ts`
- `libs/database/src/lib/models/IssueGitHubLink.model.ts`

All models registered in:
- `libs/database/src/lib/models/index.ts`
- `libs/database/src/lib/db.ts` (Sequelize initialization)

---

### ✅ Phase 1b: GitHub API Client Library (100%)

**Library:** `libs/github/` (created with Nx)

**Dependencies Added:**
- `@octokit/rest` - Official GitHub API client

**Files Created:**

1. **`libs/github/src/lib/types.ts`** - TypeScript interfaces
   - `GitHubClientConfig` - Client configuration
   - `GitHubRepository` - Repository data structure
   - `GitHubPullRequest` - PR data structure
   - `GitHubIssue` - Issue data structure
   - `GitHubReview` - Code review data structure
   - `GitHubUserActivity` - Comprehensive activity summary
   - `GitHubSearchOptions`, `RepositoryActivityOptions`, `RetryOptions`

2. **`libs/github/src/lib/github-client.ts`** - API client with robust features
   - **Authentication:** Token-based with Octokit
   - **Retry Logic:** Exponential backoff (max 3 retries, 1s → 10s delays)
   - **Error Handling:** Rate limiting, timeouts, server errors
   - **Pagination:** Automatic pagination for all list operations

   **Key Methods:**
   - `getCurrentUser()` - Get authenticated user info
   - `getUserRepositories(username, since)` - Repos with recent activity (90 days)
   - `getUserPullRequests(username, options)` - PRs authored by user (30 days)
   - `getPullRequestDetails(owner, repo, number)` - Full PR with code stats
   - `getUserIssues(username, options)` - Issues involving user
   - `getIssueDetails(owner, repo, number)` - Full issue details
   - `getUserReviews(username, since)` - Reviews given by user
   - `getPullRequestReviews(owner, repo, number)` - All reviews on a PR
   - `getUserActivity(username, since, until)` - **Comprehensive activity fetch**

3. **`libs/github/src/index.ts`** - Exports all types and client

---

### ✅ Phase 1c: GitHub Sync Service (100%)

**Service:** `apps/api/src/app/services/github-sync.service.ts`

Mirrors the Linear pattern from `issue-sync.service.ts`:

**Core Functions:**

1. **Upsert Functions** (persist API data to database):
   - `upsertRepository(githubRepo)` → Repository
   - `upsertPullRequest(githubPR)` → GitHubPullRequest
   - `upsertIssue(githubIssue)` → GitHubIssue
   - `upsertReview(githubReview, prId)` → GitHubCodeReview

2. **Snapshot Function:**
   - `createGitHubSnapshot(params)` → UserGitHubSnapshot
   - Categories: `completed_pr`, `active_pr`, `completed_issue`, `active_issue`, `review_given`

3. **Batch Sync Function:**
   - `syncGitHubDataToDatabase(categorizedData, options)` → void
   - Syncs all PRs, issues, reviews, repositories
   - Creates snapshots for each item with metadata
   - Called during report generation (same pattern as Linear)

4. **Query Functions** (for user app):
   - `getUserPullRequestsByCategory(userId, category, filters)` → GitHubPullRequest[]
   - `getUserIssuesByCategory(userId, category, filters)` → GitHubIssue[]
   - `getUserReviews(userId, filters)` → GitHubCodeReview[]
   - `getLatestGitHubSnapshotDate(userId)` → Date | null

**Pattern Matching Linear:**
- ✅ Data synced during report generation
- ✅ Snapshots created with report period metadata
- ✅ User app queries latest snapshot (not live API)
- ✅ Filtering support (repository, search terms)

---

### ✅ Phase 1d: Sync Status Tracking (100%)

**Problem Solved:** Users need visibility into when data was last synced

**Migration:** `libs/database/src/migrations/006-add-sync-status.ts`

**Table:** `SyncStatus`
- Fields: sync_type, status, last_started_at, last_completed_at, last_success_at, last_failed_at
- Error tracking: last_error_message
- Statistics: total_runs, success_count, failure_count
- Metadata: JSON blob for sync-specific data (items synced, duration, etc.)

**Pre-populated Sync Types:**
- `linear_issues` - Linear issue sync
- `github_data` - GitHub PR/issue/review sync
- `slack_users` - Slack user sync

**Model:** `libs/database/src/lib/models/SyncStatus.model.ts`
- Helper methods: `getMetadata<T>()`, `setMetadata(data)`

**Service:** `apps/api/src/app/services/sync-status.service.ts`

**Key Functions:**
- `startSync(syncType)` - Mark sync as started, increment total_runs
- `completeSync(syncType, metadata?)` - Mark successful, store metadata
- `failSync(syncType, error)` - Mark failed, store error message
- `withSyncTracking(syncType, fn, metadataExtractor?)` - **Wrapper function** to auto-track any sync
- `getSyncStatus(syncType)` → SyncStatusInfo
- `getAllSyncStatuses()` → SyncStatusInfo[]
- `getFormattedSyncStatuses()` → FormattedSyncStatus[] (for display)
- `getTimeSinceSync(date)` → "5 minutes ago" / "2 hours ago" / "Never"

**Integration Point:**
```typescript
// Example usage in report generation:
await withSyncTracking('github_data', async () => {
  const activity = await githubClient.getUserActivity(username);
  await syncGitHubDataToDatabase(categorizedData, options);
  return { itemsProcessed: activity.pullRequests.length };
}, (result) => ({ itemsProcessed: result.itemsProcessed }));
```

---

## Remaining Work

### 🔄 Phase 2: Linear-GitHub Correlation Logic (0%)

**Goal:** Automatically detect which GitHub PRs/issues relate to which Linear issues

**Detection Strategies (in order of confidence):**

1. **High Confidence:**
   - Linear has "GitHub PR" attachment with URL → parse PR URL
   - Branch name contains Linear issue ID (e.g., `eng-123-feature`)

2. **Medium Confidence:**
   - PR title contains Linear issue ID pattern (e.g., `[ENG-123]`, `ENG-123:`, `fixes ENG-123`)
   - PR body contains Linear issue URL or ID

3. **Low Confidence:**
   - Fuzzy matching of PR/issue titles with Linear issue titles

**Implementation Plan:**
- Create `apps/api/src/app/services/linear-github-correlation.service.ts`
- Functions:
  - `extractLinearIssueIds(text: string)` → string[] (regex patterns)
  - `correlateGitHubPRWithLinearIssues(pr, linearIssues)` → IssueGitHubLink[]
  - `correlateGitHubIssueWithLinearIssues(issue, linearIssues)` → IssueGitHubLink[]
  - `correlateBatch(githubData, linearIssues)` → IssueGitHubLink[]
- Call during sync: After syncing GitHub data, run correlation and create IssueGitHubLink records

**Regex Patterns to Support:**
- `ENG-123`, `[ENG-123]`, `ENG-123:`, `#ENG-123`
- `https://linear.app/workspace/issue/ENG-123/...`
- Branch: `eng-123-description`, `eng/123-description`

---

### 🔄 Phase 3: Integrate GitHub Sync into Report Generation (0%)

**Current Flow (Linear only):**
```
Weekly Job → Report Generation Service →
  1. Fetch Linear issues
  2. Categorize issues (completed/started/updated/open)
  3. Sync to database (issue-sync.service)
  4. Format report
  5. Send via Slack
```

**New Flow (Linear + GitHub):**
```
Weekly Job → Report Generation Service →
  1. Fetch Linear issues
  2. Fetch GitHub activity (NEW)
  3. Categorize Linear issues
  4. Categorize GitHub data (NEW)
  5. Correlate Linear ↔ GitHub (NEW)
  6. Sync Linear to database
  7. Sync GitHub to database (NEW)
  8. Format NEW report structure (wins/active/focus)
  9. Send via Slack
```

**Files to Modify:**
- `apps/api/src/app/services/report-generation.service.ts`
  - Add GitHub client initialization
  - Add `fetchGitHubDataForUser()` function
  - Add `categorizeGitHubData()` function
  - Integrate correlation logic
  - Call `syncGitHubDataToDatabase()`

**New Report Structure (from original plan):**
```
🏆 WINS THIS WEEK
  • High-Priority Completions (Linear)
  • Features Shipped (PRs merged)
  • Issues Resolved (Linear + GitHub)
  • Collaboration (reviews given)

🔄 ACTIVE WORK
  • In Progress (Linear + GitHub)
  • Pull Requests Under Review

🎯 THIS WEEK'S FOCUS
  • High Priority items
  • Items due soon
  • Blocked items

📊 WEEK AT A GLANCE
  • 5 issues closed
  • 3 PRs merged
  • 4 reviews given
  • +234 / -292 lines of code
```

---

### 🔄 Phase 4: Add Sync Status API Endpoints (0%)

**Goal:** Expose sync timestamps to admin and user apps

**New Routes:** `apps/api/src/app/routes/sync.routes.ts` (create new file)

**Endpoints to Add:**

1. **GET `/api/admin/sync-status`** - All sync statuses (admin only)
   ```json
   [
     {
       "syncType": "linear_issues",
       "status": "success",
       "lastSyncTime": "5 minutes ago",
       "successRate": "98%",
       "lastError": null
     },
     {
       "syncType": "github_data",
       "status": "success",
       "lastSyncTime": "10 minutes ago",
       "successRate": "100%",
       "lastError": null
     }
   ]
   ```

2. **GET `/api/admin/sync-status/:syncType`** - Detailed status for one sync type
   ```json
   {
     "syncType": "github_data",
     "status": "success",
     "lastStartedAt": "2025-10-28T10:00:00Z",
     "lastCompletedAt": "2025-10-28T10:02:30Z",
     "lastSuccessAt": "2025-10-28T10:02:30Z",
     "totalRuns": 42,
     "successCount": 42,
     "failureCount": 0,
     "metadata": {
       "itemsProcessed": 23,
       "durationMs": 2500
     }
   }
   ```

3. **POST `/api/admin/trigger-sync/:syncType`** - Manually trigger a sync (admin only)

4. **GET `/api/user/sync-status`** - Simplified sync status for current user
   ```json
   {
     "linearLastSync": "2025-10-28T10:00:00Z",
     "githubLastSync": "2025-10-28T10:02:30Z",
     "dataFreshness": "5 minutes ago"
   }
   ```

**UI Integration Points:**
- Admin app: `/admin/sync-status` page showing all sync statuses
- User app: Footer or header showing "Last updated: 5 minutes ago"

---

### 🔄 Phase 5: Add GitHub Configuration (0%)

**Current Config System:** `libs/shared-types/src/lib/config.types.ts`

**Add to ConfigKey type:**
```typescript
export type ConfigKey =
  | 'SLACK_BOT_TOKEN'
  | 'LINEAR_API_KEY'
  | 'GITHUB_TOKEN'        // NEW
  | 'SLACK_SIGNING_SECRET'
  | 'REPORT_SCHEDULE';
```

**Files to Modify:**
- `apps/api/src/main.ts` - Load GITHUB_TOKEN from env/encrypted config
- Admin app config page - Add GitHub token input field
- User model - Link Slack users to GitHub usernames (mapping service)

**GitHub Username Mapping:**
- Option 1: Admin manually maps Slack users → GitHub usernames
- Option 2: Auto-detect via email matching (GitHub API: `GET /user/emails`)
- Option 3: OAuth flow for users to connect their GitHub accounts

**Recommended Approach:** Start with Option 1 (manual mapping), add Option 3 later

---

### ⏸️ Phase 6: Report Format Redesign (0%)

**Current Format:** 4 sections (Completed / Started / Updated / Open)

**New Format:** 3 sections (Wins / Active / Focus) with GitHub data integrated

**Service to Create:** `apps/api/src/app/services/report-formatter-v2.service.ts`

**Key Functions:**
- `formatWinsSection(linearCompleted, githubPRsMerged, githubIssuesClosed, reviews)` → string
- `formatActiveSection(linearInProgress, githubActivePRs, githubActiveIssues)` → string
- `formatFocusSection(linearHighPriority, blockedItems, dueItems)` → string
- `formatMetricsSection(issuesClosed, prsMerged, reviewsGiven, linesAdded, linesDeleted)` → string
- `formatWeeklyReportV2(combinedData)` → string (full report)

**Feature Flag:** Add `USE_NEW_REPORT_FORMAT` config to allow gradual rollout

---

### ⏸️ Phase 7: User App Enhancements (0%)

**Phase 7 is deferred** - Focus on getting reports working first, then enhance user app

When ready:
- Add GitHub Work page (PRs, Issues, Reviews tabs)
- Add Overview dashboard with metrics
- Add Weekly Reports archive
- Add sync timestamp footer

---

## Testing Plan

### Phase 1 Testing (Current)

**Database Migration Test:**
```bash
# From project root
cd apps/api
pnpm nx run database:migrate
# Should create all 7 new tables + SyncStatus table
```

**Model Tests:**
```bash
# Check Sequelize can initialize all models
pnpm nx test database
```

**GitHub Client Test (Manual):**
```typescript
// Create test script: apps/api/src/scripts/test-github-client.ts
import { GitHubClient } from '@slack-linear-rundown/github';

const client = new GitHubClient({
  token: process.env.GITHUB_TOKEN!,
});

const activity = await client.getUserActivity('your-username');
console.log('PRs:', activity.pullRequests.merged.length);
console.log('Issues:', activity.issues.closed.length);
console.log('Reviews:', activity.reviews.length);
```

### Phase 2-3 Testing

**Correlation Test:**
- Create sample Linear issues with GitHub PR links
- Run correlation service
- Verify IssueGitHubLink records created with correct confidence levels

**Report Generation Test:**
- Manually trigger report for test user
- Verify GitHub data synced to database
- Verify UserGitHubSnapshot records created
- Check Slack message includes GitHub activity

### Phase 4 Testing

**API Endpoint Test:**
```bash
curl http://localhost:3000/api/admin/sync-status
# Should return sync status for all types

curl http://localhost:3000/api/user/sync-status
# Should return user-specific sync status
```

---

## File Structure Summary

```
slack-linear-rundown/
├── libs/
│   ├── github/                                    # NEW
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   │   ├── types.ts                       # ✅ GitHub API types
│   │   │   │   └── github-client.ts               # ✅ Octokit-based client
│   │   │   └── index.ts                           # ✅ Exports
│   │   └── package.json                           # ✅ @octokit/rest dependency
│   │
│   └── database/
│       └── src/
│           ├── migrations/
│           │   ├── 005-add-github-integration.ts  # ✅ GitHub tables
│           │   └── 006-add-sync-status.ts         # ✅ Sync tracking
│           └── lib/
│               ├── models/
│               │   ├── Repository.model.ts        # ✅ GitHub repo
│               │   ├── GitHubPullRequest.model.ts # ✅ PR data
│               │   ├── GitHubIssue.model.ts       # ✅ Issue data
│               │   ├── GitHubCodeReview.model.ts  # ✅ Review data
│               │   ├── UserGitHubSnapshot.model.ts# ✅ Snapshot
│               │   ├── IssueGitHubLink.model.ts   # ✅ Correlation
│               │   ├── SyncStatus.model.ts        # ✅ Sync tracking
│               │   ├── User.model.ts              # ✅ Added GitHub fields
│               │   └── index.ts                   # ✅ Updated exports
│               └── db.ts                          # ✅ Registered models
│
└── apps/
    └── api/
        └── src/
            └── app/
                ├── services/
                │   ├── github-sync.service.ts              # ✅ GitHub sync logic
                │   ├── sync-status.service.ts              # ✅ Sync tracking
                │   ├── issue-sync.service.ts               # ✅ Existing Linear sync
                │   ├── linear-github-correlation.service.ts# 🔄 TODO
                │   ├── report-generation.service.ts        # 🔄 TODO: Integrate GitHub
                │   └── report-formatter-v2.service.ts      # 🔄 TODO: New format
                └── routes/
                    └── sync.routes.ts                      # 🔄 TODO: Sync status API
```

---

## Next Steps (Priority Order)

1. **✅ Run migrations** to create tables
   ```bash
   cd apps/api
   pnpm nx run database:migrate
   ```

2. **🔄 Add GITHUB_TOKEN to configuration system**
   - Add to `config.types.ts`
   - Update config loading in `main.ts`
   - Test with personal access token

3. **🔄 Implement Linear-GitHub correlation logic**
   - Create `linear-github-correlation.service.ts`
   - Test regex patterns for issue ID extraction
   - Test correlation accuracy

4. **🔄 Integrate GitHub into report generation**
   - Modify `report-generation.service.ts`
   - Add GitHub data fetching
   - Add categorization logic
   - Wire up sync services

5. **🔄 Test end-to-end flow**
   - Manually trigger report for test user
   - Verify data in database
   - Check Slack message format

6. **🔄 Add sync status API endpoints**
   - Create `sync.routes.ts`
   - Test with Postman/curl

7. **🔄 Update report format (optional enhancement)**
   - Create formatter v2 service
   - Add feature flag
   - A/B test with users

---

## Dependencies

**Installed:**
- ✅ `@octokit/rest` (GitHub API client)

**Configuration Needed:**
- 🔄 `GITHUB_TOKEN` environment variable (Personal Access Token or GitHub App)
  - Scopes needed: `repo`, `read:user`, `user:email`

**Optional:**
- GitHub App (for production) vs Personal Access Token (for development)

---

## Notes & Decisions

**Data Sync Pattern:**
- ✅ **Decision:** Follow Linear's pattern - sync during report generation, not on-demand
- ✅ **Rationale:** Reduces API calls, provides historical snapshots, simplifies user app queries

**Snapshot Strategy:**
- ✅ **Decision:** Create UserGitHubSnapshot records for each PR/issue/review in a report
- ✅ **Rationale:** Allows querying "What was in my last report?" without re-fetching from GitHub

**Correlation Confidence:**
- 🔄 **Decision Needed:** What confidence threshold should trigger automatic linking?
  - Suggested: Link on "high" + "medium", flag "low" for manual review

**GitHub Username Mapping:**
- 🔄 **Decision Needed:** How to map Slack users → GitHub users?
  - Option 1: Manual admin mapping (simplest)
  - Option 2: Email matching (requires GitHub email API access)
  - Option 3: OAuth connection (best UX, more complex)

**Report Format:**
- 🔄 **Decision Needed:** Replace old format entirely or add feature flag?
  - Suggested: Feature flag for gradual rollout

---

## Error Encountered

While working on Phase 1, I hit an error in one of the background bash processes. The core implementation is complete and stable, but we should verify the dev servers are running correctly before proceeding.

**Status Check Needed:**
```bash
# Check if dev servers are running
pnpm dev
# Should start: API server, User app, Admin app, Admin API
```

---

## Questions for Next Session

1. Should we run migrations now to test the database schema?
2. Do you have a GitHub Personal Access Token ready for testing?
3. What GitHub organizations/repos should we target for syncing?
4. Should we map Slack users → GitHub users manually or build an auto-detection system?
5. Should we replace the old report format entirely or add a feature flag?

---

**Document Status:** Checkpoint created - Ready to resume from Phase 2
