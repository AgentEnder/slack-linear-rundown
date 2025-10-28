# User-Facing App Architecture

## Overview

A separate React application served alongside the admin app, providing users with a clean interface to browse their Linear issues.

## App Structure

```
apps/
├── admin/              # Existing admin UI (port 4200)
├── user/               # NEW: User-facing app (port 4300)
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   ├── IssueCard.tsx
│   │   │   │   ├── IssueList.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── CategoryTabs.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── CompletedIssues.tsx
│   │   │   │   ├── StartedIssues.tsx
│   │   │   │   ├── UpdatedIssues.tsx
│   │   │   │   └── OpenIssues.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useIssues.ts
│   │   │   │   └── useFilters.ts
│   │   │   └── App.tsx
│   │   ├── styles/
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── project.json
└── api/
    └── src/
        └── app/
            └── routes/
                └── user.routes.ts  # NEW: API routes for user app
```

## Routing Structure

### Frontend Routes

```typescript
// apps/user/src/app/App.tsx
<BrowserRouter>
  <Routes>
    <Route path="/user" element={<Dashboard />}>
      <Route path="completed" element={<CompletedIssues />} />
      <Route path="started" element={<StartedIssues />} />
      <Route path="updated" element={<UpdatedIssues />} />
      <Route path="open" element={<OpenIssues />} />
    </Route>
    <Route path="/auth/callback" element={<AuthCallback />} />
  </Routes>
</BrowserRouter>
```

### Backend API Routes

```typescript
// apps/api/src/app/routes/user.routes.ts

// Get authenticated user's issues by category
router.get('/api/user/issues/:category', requireAuth, async (req, res) => {
  const { category } = req.params;
  const { userId } = req.auth;  // From auth middleware

  const issues = await getUserIssues(userId, category);
  res.json({ issues });
});

// Search user's issues
router.get('/api/user/issues/search', requireAuth, async (req, res) => {
  const { q, filters } = req.query;
  const { userId } = req.auth;

  const issues = await searchUserIssues(userId, q, filters);
  res.json({ issues });
});
```

## Key Components

### IssueCard Component

```typescript
interface IssueCardProps {
  issue: Issue;
}

function IssueCard({ issue }: IssueCardProps) {
  return (
    <div className="issue-card">
      <div className="issue-header">
        <a
          href={`https://linear.app/team/${issue.team_key}/issue/${issue.identifier}`}
          target="_blank"
          rel="noopener noreferrer"
          className="issue-identifier"
        >
          {issue.identifier}
        </a>
        <PriorityBadge priority={issue.priority} />
        <StatusBadge status={issue.state_type} />
      </div>

      <h3 className="issue-title">{issue.title}</h3>

      {issue.description && (
        <p className="issue-description">
          {truncate(issue.description, 200)}
        </p>
      )}

      <div className="issue-meta">
        {issue.project_name && (
          <span className="meta-item">📁 {issue.project_name}</span>
        )}
        {issue.team_name && (
          <span className="meta-item">👥 {issue.team_name}</span>
        )}
        {issue.estimate && (
          <span className="meta-item">⏱️ {issue.estimate} pts</span>
        )}
      </div>

      <div className="issue-timestamps">
        <span>Updated {formatRelative(issue.updated_at)}</span>
      </div>
    </div>
  );
}
```

### FilterBar Component

```typescript
interface FilterBarProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [projects, setProjects] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);

  // Fetch available filter options
  useEffect(() => {
    async function loadOptions() {
      const { projects, teams } = await fetchFilterOptions();
      setProjects(projects);
      setTeams(teams);
    }
    loadOptions();
  }, []);

  return (
    <div className="filter-bar">
      <Select
        label="Project"
        value={filters.project}
        options={projects}
        onChange={(project) => onFilterChange({ ...filters, project })}
      />

      <Select
        label="Team"
        value={filters.team}
        options={teams}
        onChange={(team) => onFilterChange({ ...filters, team })}
      />

      <Select
        label="Priority"
        value={filters.priority}
        options={['None', 'Low', 'Medium', 'High', 'Urgent']}
        onChange={(priority) => onFilterChange({ ...filters, priority })}
      />

      <button onClick={() => onFilterChange({})}>Clear Filters</button>
    </div>
  );
}
```

## State Management

### React Query for Data Fetching

```typescript
// apps/user/src/app/hooks/useIssues.ts

export function useIssues(category: string, filters: Filters) {
  return useQuery({
    queryKey: ['issues', category, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...filters,
        category,
      });

      const response = await fetch(`/api/user/issues?${params}`, {
        credentials: 'include',  // Include auth cookie
      });

      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  });
}
```

### URL State for Filters

```typescript
// apps/user/src/app/pages/CompletedIssues.tsx

function CompletedIssues() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    project: searchParams.get('project') || undefined,
    team: searchParams.get('team') || undefined,
    priority: searchParams.get('priority') || undefined,
  };

  const { data, isLoading, error } = useIssues('completed', filters);

  const handleFilterChange = (newFilters: Filters) => {
    setSearchParams(newFilters);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="issues-page">
      <h1>✅ Completed This Week</h1>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      <IssueList issues={data.issues} />
    </div>
  );
}
```

## Integration with API Server

### Development Setup

```json
// apps/user/vite.config.ts
export default defineConfig({
  server: {
    port: 4300,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Production Build

```typescript
// apps/api/src/main.ts

// Serve user app (after admin app)
app.use('/user', express.static(path.join(__dirname, 'public-user')));

// Fallback for client-side routing
app.get('/user/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-user', 'index.html'));
});
```

## Styling

### Tailwind CSS + Component Library

```bash
# Install dependencies
pnpm add -D tailwindcss postcss autoprefixer
pnpm add @radix-ui/react-select @radix-ui/react-tabs
```

### Design Tokens

```css
/* apps/user/src/styles/variables.css */
:root {
  --color-urgent: #ef4444;
  --color-high: #f97316;
  --color-medium: #eab308;
  --color-low: #22c55e;

  --color-completed: #10b981;
  --color-started: #3b82f6;
  --color-updated: #8b5cf6;
  --color-open: #64748b;

  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;

  --border-radius: 0.5rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## Mobile Responsiveness

### Responsive Layout

```tsx
// apps/user/src/app/components/IssueList.tsx

function IssueList({ issues }: IssueListProps) {
  return (
    <div className="issue-list">
      {/* Desktop: 2-column grid */}
      {/* Mobile: Single column */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}
```

## Performance Optimizations

1. **Pagination** - Load issues in batches (50 at a time)
2. **Virtual scrolling** - For long lists
3. **Debounced search** - Avoid excessive API calls
4. **Cached filters** - Remember user preferences
5. **Optimistic updates** - Instant UI feedback

## Next Steps

1. Generate user app with Nx: `nx g @nx/react:app user`
2. Set up routing and basic layout
3. Implement authentication middleware
4. Build core components
5. Connect to API endpoints
