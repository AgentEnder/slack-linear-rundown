# User-Facing App Overview

## Problem Statement

Currently, weekly reports sent via Slack include "View all" links that attempt to construct Linear search URLs. These links don't work reliably because:

1. Linear's search URL structure is not stable/documented
2. Complex filters don't translate well to URLs
3. Users need a better way to browse and filter their issues beyond what Slack can provide

## Solution

Build a dedicated user-facing web application that:

1. **Stores issue snapshots** - Persist issue data in our database when generating reports
2. **Provides rich filtering** - Allow users to browse issues with proper UI controls
3. **Links directly to Linear** - Each issue links to its Linear counterpart for full details
4. **Replaces view links** - Slack reports link to this app instead of attempting Linear searches

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Slack Reports                          │
│  ✅ Completed This Week → /user/reports/completed           │
│  🔄 Started This Week → /user/reports/started               │
│  📝 Updated This Week → /user/reports/updated               │
│  📋 Other Open Issues → /user/reports/open                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   User-Facing Web App                       │
│                                                             │
│  • Authenticated access (via Slack OAuth)                  │
│  • Browse issues by status/category                        │
│  • Filter by project, team, priority, etc.                 │
│  • Search across issue titles/descriptions                 │
│  • Links to Linear for full issue details                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                         │
│                                                             │
│  • issues table - snapshots of Linear issues               │
│  • user_issues table - user-specific issue associations    │
│  • Synced when reports are generated                       │
│  • Timestamped for historical tracking                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### Phase 1: Core Functionality
- [ ] Issue data persistence and sync
- [ ] User-facing React app setup
- [ ] Basic issue browsing by category
- [ ] Authentication via Slack
- [ ] Direct links from Slack reports

### Phase 2: Enhanced UX
- [ ] Advanced filtering (project, team, priority, status)
- [ ] Search functionality
- [ ] Issue detail views
- [ ] Sorting and pagination
- [ ] Responsive design for mobile

### Phase 3: Analytics & Insights
- [ ] Historical trend views
- [ ] Team/project dashboards
- [ ] Completion rate tracking
- [ ] Time-in-status analysis

## Benefits

1. **Better UX** - Proper web UI instead of trying to hack Linear URLs
2. **Reliability** - No dependency on Linear's URL structure
3. **Historical data** - We can show trends over time
4. **Customization** - Build exactly what users need
5. **Integration** - Can add features specific to our workflow

## Next Steps

See detailed plans in:
- `01-database-schema.md` - Issue persistence design
- `02-sync-mechanism.md` - How/when to sync Linear data
- `03-app-architecture.md` - React app structure
- `04-authentication.md` - Slack OAuth integration
- `05-implementation-roadmap.md` - Phased delivery plan
