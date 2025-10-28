# Planning Changelog

## 2025-10-27: Requirement Clarifications

### Major Changes to Report Scope and Cooldown Filtering

The following clarifications were received and incorporated into all planning documents:

#### 1. Report Scope Changed: Show ALL Assigned Issues

**Previous Understanding**:
- Reports would show only issues updated in the last 7 days
- Focus was on recent activity only

**Corrected Requirement**:
- Reports must show **ALL open issues** assigned to the user, regardless of when they were last touched
- Includes recently closed issues (within past month) for historical context
- Recent activity (last 7 days) is highlighted but doesn't exclude other issues
- This surfaces stale issues that need attention

**Rationale**: Developers need visibility into all their assigned work, not just what changed recently. Stale issues are often the ones that need the most attention.

**API Optimization**: To reduce payload size, exclude only issues that are BOTH:
- Closed (completed or canceled) AND
- Not updated in the past month

**GraphQL Filter**:
```graphql
filter: {
  or: [
    { state: { type: { nin: ["completed", "canceled"] } } }
    { updatedAt: { gte: $oneMonthAgo } }
  ]
}
```

#### 2. Cooldown Filtering: Project Board-Based

**Previous Understanding**:
- Cooldown mode would adjust messaging but show same issues
- Focus on "cooldown-appropriate work" was conceptual, not filtered

**Corrected Requirement**:
- During cooldown, filter issues based on project board assignment
- **Exclude**: All issues assigned to a project board
- **Include**: Issues NOT on a project board (unboarded work)
- **Exception**: Include issues from projects with "misc" or "DPE" in the name (case-insensitive)

**Rationale**: Cooldown periods are for maintenance work, tech debt, and miscellaneous tasks - not feature board work.

**Filtering Logic**:
```typescript
function filterForCooldown(issues: LinearIssue[]): LinearIssue[] {
  return issues.filter(issue => {
    // Include if no project (unboarded work)
    if (!issue.project) return true

    // Include if project name contains 'misc' or 'dpe'
    const projectName = issue.project.name.toLowerCase()
    if (projectName.includes('misc') || projectName.includes('dpe')) {
      return true
    }

    // Exclude all other project board issues
    return false
  })
}
```

### Report Structure Updates

**New Report Sections**:
1. **Summary**: Shows total open issues + weekly activity counts
2. **Completed This Week**: Issues completed in last 7 days
3. **Started This Week**: Issues started in last 7 days
4. **Updated This Week**: Issues updated in last 7 days
5. **Other Open Issues** (NEW): All other open issues not recently touched

The "Other Open Issues" section is critical - it surfaces work that may be blocked, forgotten, or needs prioritization.

### Documents Updated

All planning documents have been updated to reflect these requirements:

- ✅ `01-api-research.md` - Updated GraphQL queries and filtering strategies
- ✅ `02-architecture.md` - (No changes needed, architecture supports this)
- ✅ `03-features.md` - Updated Feature 2 (Linear Data Fetching) and Feature 3 (Cooldown Tracking)
- ✅ `00-overview.md` - Updated report examples to show all open issues

### Implementation Impact

**Linear Library** (`libs/linear`):
- Query must fetch ALL assigned issues (with optimization filter)
- No change to pagination strategy
- Client-side categorization by date ranges

**Report Generation Service** (`apps/api/src/app/services/report-generation.service.ts`):
- Must categorize issues into 4 buckets:
  1. Recently completed (last 7 days)
  2. Recently started (last 7 days)
  3. Recently updated (last 7 days)
  4. Other open issues (not recently touched)
- Must apply cooldown filtering when user is in cooldown
- Must handle projects with null/undefined values

**Cooldown Service** (`apps/api/src/app/services/cooldown.service.ts`):
- Add method: `filterIssuesForCooldown(issues: LinearIssue[]): LinearIssue[]`
- Case-insensitive matching on project names
- Handle null/undefined project values

### Data Structure Changes

Updated `UserReport` interface:

```typescript
interface UserReport {
  user: {
    id: string
    name: string
    email: string
  }
  periodStart: Date  // For categorization only
  periodEnd: Date

  // Categorized by recent activity (last 7 days)
  recentlyCompleted: LinearIssue[]
  recentlyStarted: LinearIssue[]
  recentlyUpdated: LinearIssue[]

  // NEW: All other open issues
  otherOpenIssues: LinearIssue[]

  // Grouped summary
  projectSummary: {
    projectName: string | null  // null for unboarded issues
    issueCount: number
    openCount: number
    completedCount: number
  }[]
}
```

### Testing Considerations

**Additional Test Cases Needed**:

1. **Report with many stale issues**: User with 20 open issues, only 3 touched in last 7 days
2. **Cooldown filtering**:
   - User in cooldown with mix of project board and unboarded issues
   - Project with "Misc Tasks" in name should be included
   - Project with "DPE" in name should be included
   - Project with "Backend API" should be excluded
3. **Case sensitivity**: Projects named "MISC", "Misc", "misc" should all be included
4. **Null project**: Issues without project assignment should be included during cooldown
5. **API optimization**: Closed issue from 2 months ago should be excluded from query

### Performance Considerations

**Positive Impact**:
- Single query fetches all needed data (no separate recent + all queries)
- Filtering happens client-side (no additional API calls)

**Potential Concern**:
- Users with many assigned issues (>100) will have larger payloads
- Mitigation: Pagination already implemented, one-month closed filter reduces payload
- Expected: Most users have <50 assigned issues, query will be fast

### Timeline Impact

**No change to implementation timeline**. These are clarifications, not scope changes:
- Linear client was already planned to handle filtering and pagination
- Report generation service was already planned to categorize issues
- Cooldown service was already planned, just adds filtering method

Estimated additional work: **+2-3 hours** for the filtering logic and additional test cases.

---

## Change Summary

| Area | Change Type | Impact |
|------|-------------|---------|
| Report Scope | Major Clarification | Shows ALL issues, not just recent |
| Cooldown Filtering | New Requirement | Filter by project board assignment |
| GraphQL Query | Modified | Changed filter logic |
| Report Structure | Enhanced | Added "Other Open Issues" section |
| Data Structures | Modified | Updated TypeScript interfaces |
| Testing | Expanded | New test cases needed |
| Timeline | None | No change to schedule |

---

**Status**: All planning documents updated ✅
**Ready for**: Implementation (Phase 0)
**Last Updated**: 2025-10-27
