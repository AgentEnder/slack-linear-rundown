# User-Facing App Plan

## Context

The current implementation sends weekly reports via Slack with "View all" links attempting to construct Linear search URLs. These links don't work reliably, so we're building a dedicated user-facing web app.

## Goals

1. **Replace broken links** - Slack reports will link to our app instead of Linear searches
2. **Persist issue data** - Store issue snapshots when generating reports
3. **Provide better UX** - Rich filtering, search, and browsing capabilities
4. **Enable analytics** - Historical tracking and insights

## Plan Documents

1. **[00-overview.md](./00-overview.md)** - High-level problem statement and solution approach
2. **[01-database-schema.md](./01-database-schema.md)** - Issue persistence design and data model
3. **[02-app-architecture.md](./02-app-architecture.md)** - React app structure and implementation details

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database migration for `issues` and `user_issue_snapshots` tables
- [ ] Issue sync service integration in report generation
- [ ] Basic React app setup (Nx + Vite + React)
- [ ] Simple authentication middleware
- [ ] Single category view (e.g., "Completed This Week")

**Deliverable**: Users can click a link in Slack and see their completed issues in a web UI

### Phase 2: Full Categories (Week 3)
- [ ] All four category pages (Completed, Started, Updated, Open)
- [ ] Update Slack report formatter to use new app links
- [ ] Basic filtering (project, team)
- [ ] Responsive design for mobile

**Deliverable**: All "View all" links in Slack reports work properly

### Phase 3: Enhanced Features (Week 4-5)
- [ ] Search functionality
- [ ] Advanced filters (priority, status, estimates)
- [ ] Sorting options
- [ ] Better empty states and loading UX
- [ ] Issue detail modal/page

**Deliverable**: Feature-complete browsing experience

### Phase 4: Analytics & Insights (Future)
- [ ] Historical trend views
- [ ] Team/project dashboards
- [ ] Completion rate tracking
- [ ] Time-in-status analysis
- [ ] Export capabilities

**Deliverable**: Data-driven insights for users and teams

## Quick Start

### 1. Database Setup

```bash
# Create migration
pnpm nx run @slack-linear-rundown/database:migration:create add-issue-persistence

# Run migration
pnpm nx run @slack-linear-rundown/database:migration:run
```

### 2. Generate User App

```bash
# Create new React app with Nx
pnpm nx g @nx/react:app user --bundler=vite --routing --style=css
```

### 3. Add API Routes

```bash
# Create user routes file
touch apps/api/src/app/routes/user.routes.ts
```

### 4. Integrate Sync in Report Generation

```typescript
// apps/api/src/app/services/report-generation.service.ts

// Add after fetching Linear data:
await syncIssuesToDatabase(user.id, issues, reportPeriod);
```

## Technical Decisions

### Why a separate app?

- **Clear separation** - Admin vs. User concerns
- **Independent scaling** - Different performance requirements
- **Easier development** - No risk of breaking admin functionality
- **Future flexibility** - Can deploy separately if needed

### Why persist issue data?

- **Reliability** - No dependency on Linear API for browsing
- **Performance** - Fast queries without API latency
- **Historical data** - Enable trend analysis
- **Offline capability** - Works even if Linear is down

### Why Slack authentication?

- **Simplicity** - Users already authenticated via Slack
- **Security** - Leverage existing OAuth flow
- **User experience** - Single sign-on, no extra credentials

## Success Metrics

- **Reliability**: 100% of links from Slack reports work
- **Performance**: Issue list loads in < 500ms
- **Adoption**: % of users clicking through from Slack
- **Satisfaction**: User feedback on browsing experience

## Resources

- [Slack Block Kit](https://api.slack.com/block-kit) - For updating report links
- [React Query](https://tanstack.com/query/latest) - Data fetching
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Next Actions

1. ✅ Remove "View all" links from current reports (temporary)
2. ⏳ Review and approve this plan
3. ⏳ Start Phase 1 implementation
4. ⏳ Set up project in Nx workspace
5. ⏳ Create database migration
