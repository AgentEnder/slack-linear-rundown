# Report Aggregation Feature

## Overview

To handle users with many open issues, the report formatter now intelligently aggregates issues by priority when a category contains more than 10 issues. This creates concise, scannable reports with links to filtered Linear searches for the full dataset.

## Implementation Date

October 27, 2025

## Problem Statement

When developers have 20+ open issues, listing every single issue in the Slack report becomes:
- **Overwhelming** - Too much information to process
- **Unreadable** - Loses focus on what's important
- **Inefficient** - Users can't quickly scan priorities

## Solution

### Aggregation Threshold

Reports now use a **10-issue threshold**:
- **≤10 issues**: Show full list (current behavior preserved)
- **>10 issues**: Show aggregated priority summary with Linear search links

### Special Case: "Other Open Issues"

The "Other Open Issues" section (which shows stale work) **always** uses aggregation, regardless of count, since this is typically the largest category.

## Features

### 1. Priority-Based Aggregation

Issues are grouped by Linear's priority scale:
- 🔴 **Urgent** (Priority 1)
- 🟠 **High** (Priority 2)
- 🟡 **Medium** (Priority 3)
- 🟢 **Low** (Priority 4)
- ⚪ **None** (Priority 0)

### 2. Linear Search URLs

Each priority group includes a clickable Linear URL that filters to:
- Issues assigned to the user (`assignee:[userId]`)
- Specific priority level (`priority:[1-4]`)

**Example URL**:
```
https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A1
```

### 3. Graceful Degradation

If the system cannot construct Linear URLs (missing team key or user ID), it falls back to showing counts without links:

```
📊 Priority Summary (45 total):
  🔴 Urgent: 3 issues
  🟠 High: 12 issues
  🟡 Medium: 18 issues
```

## Example Reports

### Before (Full List - Used when ≤10 issues)

```
📋 Other Open Issues
  Project: Backend API
    • ENG-123 - Implement authentication 🔴
    • ENG-145 - Add rate limiting 🟠
    • ENG-156 - Fix login bug 🟡

  No Project:
    • ENG-178 - Refactor error handling 🟠
    • ENG-180 - Update dependencies 🟢
```

### After (Aggregated - Used when >10 issues)

```
📋 Other Open Issues
  📊 Priority Summary (45 total):
    🔴 Urgent: 3 issues → https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A1
    🟠 High: 12 issues → https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A2
    🟡 Medium: 18 issues → https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A3
    🟢 Low: 8 issues → https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A4
    ⚪ None: 4 issues → https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A0
```

## Technical Implementation

### Files Modified

1. **libs/slack/src/lib/types.ts**
   - Added `linearTeamKey?: string` to `UserReport`
   - Added `linearUserId?: string` to `UserReport`

2. **libs/slack/src/lib/formatters.ts**
   - Added `AGGREGATION_THRESHOLD = 10` constant
   - Added `aggregateIssuesByPriority()` export
   - Added `buildLinearSearchUrl()` export
   - Updated `formatIssueList()` to support aggregation
   - Added `formatAggregatedIssues()` private function
   - Added `formatFullIssueList()` private function (extracted existing logic)

3. **libs/slack/src/index.ts**
   - Exported `aggregateIssuesByPriority`
   - Exported `buildLinearSearchUrl`

4. **apps/api/src/app/services/report-generation.service.ts**
   - Updated `formatReport()` to extract team key from issue identifiers
   - Passes `linearTeamKey` and `linearUserId` to report formatter

### New Public API

#### `aggregateIssuesByPriority(issues: Issue[]): PriorityGroup[]`

Groups issues by priority and returns structured data:

```typescript
const groups = aggregateIssuesByPriority(issues);
// Returns:
[
  { priority: 1, count: 3, label: 'Urgent', emoji: '🔴' },
  { priority: 2, count: 12, label: 'High', emoji: '🟠' },
  { priority: 3, count: 18, label: 'Medium', emoji: '🟡' },
  { priority: 4, count: 8, label: 'Low', emoji: '🟢' },
  { priority: 0, count: 4, label: 'None', emoji: '⚪' }
]
```

#### `buildLinearSearchUrl(teamKey: string, userId: string, priority?: number): string`

Constructs a Linear search URL:

```typescript
const url = buildLinearSearchUrl('ENG', '123', 1);
// Returns: "https://linear.app/ENG/issues?filter=assignee%3A123+priority%3A1"

const urlAllIssues = buildLinearSearchUrl('ENG', '123');
// Returns: "https://linear.app/ENG/issues?filter=assignee%3A123"
```

## Team Key Extraction

The system automatically extracts the team key from issue identifiers:

```typescript
// Issue identifier: "ENG-123"
// Team key extracted: "ENG"

// Regex: /^([A-Z]+)-\d+$/
const match = "ENG-123".match(/^([A-Z]+)-\d+$/);
const teamKey = match[1]; // "ENG"
```

This works for standard Linear team keys (uppercase letters followed by hyphen and number).

## Configuration

### Threshold

To change the aggregation threshold, edit `libs/slack/src/lib/formatters.ts`:

```typescript
const AGGREGATION_THRESHOLD = 10; // Change this value
```

### Force Aggregation

To always use aggregation for specific sections, pass `forceAggregate: true`:

```typescript
formatIssueList(issues, teamKey, userId, true);
```

Currently forced for "Other Open Issues" section.

## Testing

All existing tests pass (10/10):
- ✅ Report formatting tests
- ✅ Slack client tests
- ✅ Build verification

The feature is backward compatible - reports without `linearTeamKey` or `linearUserId` will show aggregated counts without URLs.

## Benefits

### For Users
1. **Faster scanning** - See priority distribution at a glance
2. **Actionable insights** - Click directly to filtered Linear views
3. **Less overwhelming** - Concise summaries instead of long lists
4. **Better prioritization** - Visual priority indicators with counts

### For the System
1. **Scalable** - Handles users with 100+ issues gracefully
2. **Backward compatible** - Works without Linear metadata
3. **Configurable** - Threshold easily adjustable
4. **Performance** - No additional API calls (URLs constructed client-side)

## Future Enhancements

### Possible Improvements
1. **Project-level aggregation** - Show counts per project as well as priority
2. **Status-based aggregation** - Group by Linear workflow states
3. **Time-based aggregation** - "Updated in last 7 days", "Older than 30 days"
4. **Custom thresholds** - Per-user or per-team thresholds
5. **Block Kit** - Rich Slack UI with interactive buttons (Phase 2)

### Linear API Considerations
- Current implementation uses client-side URL construction (no API calls)
- Future: Could use Linear's saved views API to create persistent filters
- Future: Could fetch actual issue counts per priority via GraphQL

## Linear URL Format

The URLs use Linear's filter query syntax:

```
https://linear.app/{TEAM_KEY}/issues?filter={FILTERS}

Filters:
- assignee:{USER_ID}       - Issues assigned to user
- priority:{0-4}           - Priority level
- status:{STATUS_NAME}     - Workflow state
- project:{PROJECT_ID}     - Specific project

Operators:
- + (space, URL encoded)   - AND
- , (comma)                - OR

Examples:
assignee:123+priority:1              # Urgent issues for user 123
assignee:123+priority:1+status:todo  # Urgent todo issues
assignee:123+project:456             # All issues in project 456
```

## Rollback Plan

If issues arise, the feature can be disabled by:

1. **Quick fix** - Set threshold to infinity:
   ```typescript
   const AGGREGATION_THRESHOLD = Infinity;
   ```

2. **Complete rollback** - Revert files to commit before this feature

The feature is self-contained in the formatter and does not affect data fetching or storage.

## Performance Impact

- **None** - Aggregation happens in-memory during formatting
- URL construction is string concatenation (negligible cost)
- No additional database queries
- No additional API calls to Linear or Slack

## Monitoring

To monitor the effectiveness:

1. **Check delivery logs** - Are reports being delivered successfully?
2. **User feedback** - Do users find aggregated reports useful?
3. **Click tracking** (future) - Are users clicking the Linear URLs?

## Documentation Updates

- ✅ README.md - Updated with aggregation feature mention
- ✅ IMPLEMENTATION.md - Updated with feature details
- ✅ This document - Comprehensive feature documentation

## Related Planning Documents

- `plans/03-features.md` - Feature requirements
- `plans/CHANGELOG.md` - Requirements evolution
- `README.md` - User-facing documentation

---

**Status**: ✅ Complete and Tested
**Version**: 1.1.0 (Aggregation Update)
**Implemented**: October 27, 2025
