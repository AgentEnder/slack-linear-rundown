# Database Schema for Issue Persistence

## Design Goals

1. **Snapshot approach** - Store issue state at report generation time
2. **Efficient querying** - Support fast filtering and searching
3. **Historical tracking** - Enable trend analysis over time
4. **Minimal duplication** - Share data where possible
5. **Linear linkage** - Always maintain connection to source issues

## Proposed Schema

### `issues` Table

Core issue data, synced from Linear.

```sql
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Linear identifiers
  linear_id VARCHAR(255) NOT NULL UNIQUE,
  identifier VARCHAR(50) NOT NULL,  -- e.g., "NXC-123"

  -- Issue data
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER,  -- 0-4 (None, Urgent, High, Medium, Low)
  estimate REAL,

  -- Status
  state_id VARCHAR(255),
  state_name VARCHAR(100),
  state_type VARCHAR(50),  -- 'started', 'unstarted', 'completed', 'canceled'

  -- Timestamps from Linear
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  canceled_at TIMESTAMP,

  -- Project/Team
  project_id VARCHAR(255),
  project_name VARCHAR(255),
  team_id VARCHAR(255),
  team_name VARCHAR(255),
  team_key VARCHAR(20),

  -- Tracking
  first_synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for performance
  INDEX idx_linear_id (linear_id),
  INDEX idx_identifier (identifier),
  INDEX idx_state_type (state_type),
  INDEX idx_updated_at (updated_at),
  INDEX idx_team_id (team_id),
  INDEX idx_project_id (project_id)
);
```

### `user_issue_snapshots` Table

Tracks which issues were in which user's report at what time.

```sql
CREATE TABLE user_issue_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- User reference
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Issue reference
  issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

  -- Snapshot metadata
  snapshot_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,

  -- Categorization in report
  category VARCHAR(50) NOT NULL,  -- 'completed', 'started', 'updated', 'open'

  -- Issue state at snapshot time (for historical accuracy)
  state_type_snapshot VARCHAR(50),
  priority_snapshot INTEGER,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_issue_id (issue_id),
  INDEX idx_snapshot_date (snapshot_date),
  INDEX idx_category (category),
  UNIQUE INDEX idx_user_issue_snapshot (user_id, issue_id, snapshot_date)
);
```

## Data Flow

### During Report Generation

```typescript
async function generateReportForUser(user, linearClient) {
  // 1. Fetch issues from Linear (as currently done)
  const linearIssues = await fetchLinearDataForUser(linearClient, user.linear_user_id);

  // 2. Sync issues to database
  for (const linearIssue of linearIssues) {
    await upsertIssue(linearIssue);  // Insert or update
  }

  // 3. Create user-issue snapshots
  const snapshotDate = new Date();
  const categorized = categorizeIssues(linearIssues);

  for (const issue of categorized.recentlyCompleted) {
    await createSnapshot({
      user_id: user.id,
      issue_id: issue.dbId,  // From upsert result
      snapshot_date: snapshotDate,
      category: 'completed',
      state_type_snapshot: issue.state.type,
      priority_snapshot: issue.priority,
    });
  }
  // ... repeat for other categories

  // 4. Continue with existing report generation
  return formatReport(...);
}
```

### Querying User's Issues

```typescript
// Get user's completed issues from latest snapshot
async function getUserIssues(userId, category, limit = 50) {
  return await db.query(`
    SELECT
      i.*,
      uis.category,
      uis.snapshot_date
    FROM issues i
    JOIN user_issue_snapshots uis ON i.id = uis.issue_id
    WHERE uis.user_id = ?
      AND uis.category = ?
      AND uis.snapshot_date = (
        SELECT MAX(snapshot_date)
        FROM user_issue_snapshots
        WHERE user_id = ?
      )
    ORDER BY i.updated_at DESC
    LIMIT ?
  `, [userId, category, userId, limit]);
}
```

## Migration Strategy

### Initial Migration

```sql
-- Add new tables to existing database
-- migrations/007_add_issue_persistence.js

exports.up = async (sequelize) => {
  await sequelize.query(`CREATE TABLE IF NOT EXISTS issues (...)`);
  await sequelize.query(`CREATE TABLE IF NOT EXISTS user_issue_snapshots (...)`);
};

exports.down = async (sequelize) => {
  await sequelize.query(`DROP TABLE IF EXISTS user_issue_snapshots`);
  await sequelize.query(`DROP TABLE IF EXISTS issues`);
};
```

### Sequelize Models

```typescript
// libs/database/src/lib/models/Issue.ts
export class Issue extends Model {
  id!: number;
  linear_id!: string;
  identifier!: string;
  title!: string;
  description?: string;
  // ... all other fields

  static associate(models) {
    Issue.hasMany(models.UserIssueSnapshot, {
      foreignKey: 'issue_id',
      as: 'snapshots',
    });
  }
}

// libs/database/src/lib/models/UserIssueSnapshot.ts
export class UserIssueSnapshot extends Model {
  id!: number;
  user_id!: number;
  issue_id!: number;
  snapshot_date!: Date;
  category!: string;

  static associate(models) {
    UserIssueSnapshot.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
    UserIssueSnapshot.belongsTo(models.Issue, {
      foreignKey: 'issue_id',
      as: 'issue',
    });
  }
}
```

## Storage Considerations

### Estimated Data Volume

- **Active users**: 50
- **Issues per user**: ~30
- **Snapshots per week**: 1
- **Weeks per year**: 52

**Annual storage**:
- Issues: ~1,500 unique issues × 1KB ≈ 1.5MB
- Snapshots: 50 users × 30 issues × 52 weeks × 200 bytes ≈ 15MB
- **Total**: ~17MB per year (negligible)

### Cleanup Strategy (Future)

```sql
-- Delete snapshots older than 1 year
DELETE FROM user_issue_snapshots
WHERE snapshot_date < datetime('now', '-1 year');

-- Delete orphaned issues (not referenced in any snapshot)
DELETE FROM issues
WHERE id NOT IN (
  SELECT DISTINCT issue_id FROM user_issue_snapshots
);
```

## Benefits

1. **Fast queries** - No need to call Linear API for browsing
2. **Historical data** - Can see how issues evolved
3. **Offline access** - Works even if Linear is down
4. **Custom views** - Build any UI we want
5. **Analytics** - Aggregate data for insights
