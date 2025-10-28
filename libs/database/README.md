# Database Library

SQLite database library for the Slack-Linear Rundown application.

## Overview

This library provides a complete database solution using better-sqlite3, including:
- Database connection management
- Schema definitions with TypeScript types
- Migration system
- Repository pattern for data access

## Installation

The library is already configured as part of the Nx workspace. Import it in your application:

```typescript
import {
  initializeDatabase,
  runMigrations,
  UsersRepository,
  CooldownsRepository,
  ReportsRepository,
  ConfigRepository,
} from '@slack-linear-rundown/database';
```

## Usage

### Initialize Database

```typescript
import { initializeDatabase, runMigrations } from '@slack-linear-rundown/database';

// Initialize with a file path
initializeDatabase('./data/rundown.db');

// Run migrations to create tables
runMigrations();
```

### Users Repository

```typescript
import { UsersRepository } from '@slack-linear-rundown/database';

// Create or update a user
const userId = UsersRepository.upsert({
  email: 'john@example.com',
  slack_user_id: 'U123456',
  slack_real_name: 'John Doe',
  is_active: true,
});

// Find by email
const user = UsersRepository.findByEmail('john@example.com');

// Find by Slack ID
const user = UsersRepository.findBySlackId('U123456');

// Get all active users
const activeUsers = UsersRepository.getActive();

// Sync users from Slack
UsersRepository.syncUsers([
  { email: 'john@example.com', slack_user_id: 'U123456', slack_real_name: 'John Doe' },
  { email: 'jane@example.com', slack_user_id: 'U789012', slack_real_name: 'Jane Smith' },
]);

// Mark user as inactive
UsersRepository.markInactive(userId);
```

### Cooldowns Repository

```typescript
import { CooldownsRepository } from '@slack-linear-rundown/database';

// Set a cooldown schedule
CooldownsRepository.upsert({
  user_id: 1,
  next_cooldown_start: '2025-11-01',
  cooldown_duration_weeks: 2,
});

// Check if user is in cooldown
const isInCooldown = CooldownsRepository.isUserInCooldown(1);

// Get cooldown schedule for a user
const schedule = CooldownsRepository.getByUserId(1);

// Get cooldown end date
const endDate = CooldownsRepository.getCooldownEndDate(1);

// Delete cooldown schedule
CooldownsRepository.deleteCooldown(1);
```

### Reports Repository

```typescript
import { ReportsRepository } from '@slack-linear-rundown/database';

// Log a report delivery
ReportsRepository.logDelivery({
  user_id: 1,
  sent_at: new Date().toISOString(),
  status: 'success',
  report_period_start: '2025-10-20',
  report_period_end: '2025-10-27',
  issues_count: 5,
  in_cooldown: false,
});

// Get delivery history for a user
const history = ReportsRepository.getDeliveryHistory(1, 10);

// Get delivery statistics
const stats = ReportsRepository.getDeliveryStats(1);
// Returns: { total: 10, successful: 9, failed: 1, skipped: 0, successRate: 90 }

// Get most recent delivery
const lastDelivery = ReportsRepository.getMostRecentDelivery(1);

// Get failed deliveries in date range
const failedDeliveries = ReportsRepository.getFailedDeliveries(
  '2025-10-01',
  '2025-10-31'
);
```

### Config Repository

```typescript
import { ConfigRepository } from '@slack-linear-rundown/database';

// Set a configuration value
ConfigRepository.set('report_schedule', '0 9 * * 1');

// Get a configuration value
const schedule = ConfigRepository.get('report_schedule');

// Get with default fallback
const schedule = ConfigRepository.getWithDefault('report_schedule', '0 9 * * 1');

// Check if key exists
const hasSchedule = ConfigRepository.exists('report_schedule');

// Set multiple values
ConfigRepository.setMany(
  new Map([
    ['report_schedule', '0 9 * * 1'],
    ['cooldown_default_weeks', '2'],
  ])
);

// Get all configuration
const allConfig = ConfigRepository.getAll();

// Delete a configuration
ConfigRepository.deleteConfig('old_key');
```

## Database Schema

### Tables

#### users
Stores user identity mappings between Slack and Linear.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| email | TEXT | User email (unique) |
| slack_user_id | TEXT | Slack user ID (unique) |
| linear_user_id | TEXT | Linear user ID (unique) |
| slack_real_name | TEXT | User's real name from Slack |
| linear_name | TEXT | User's name from Linear |
| is_active | BOOLEAN | Whether user is active |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### cooldown_schedules
Tracks when users are in cooldown periods.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users |
| next_cooldown_start | DATE | When cooldown starts |
| cooldown_duration_weeks | INTEGER | Duration in weeks |
| created_at | DATETIME | Creation timestamp |
| updated_at | DATETIME | Last update timestamp |

#### report_delivery_log
Logs all report deliveries and their outcomes.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| user_id | INTEGER | Foreign key to users |
| sent_at | DATETIME | When report was sent |
| status | TEXT | 'success', 'failed', or 'skipped' |
| error_message | TEXT | Error details if failed |
| report_period_start | DATE | Report period start |
| report_period_end | DATE | Report period end |
| issues_count | INTEGER | Number of issues in report |
| in_cooldown | BOOLEAN | Whether user was in cooldown |

#### app_config
Stores runtime configuration key-value pairs.

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Configuration key (primary key) |
| value | TEXT | Configuration value |
| updated_at | DATETIME | Last update timestamp |

## TypeScript Types

All database models have corresponding TypeScript types exported from the library:

```typescript
import type {
  User,
  CooldownSchedule,
  ReportDeliveryLog,
  AppConfig,
} from '@slack-linear-rundown/database';
```

## Building

Run `nx build database` to build the library.

## Running unit tests

Run `nx test database` to execute the unit tests via [Jest](https://jestjs.io).

## Architecture Notes

- Uses better-sqlite3 for synchronous SQLite operations
- Repository pattern for clean separation of data access
- Foreign key constraints enabled
- WAL mode for better concurrency
- Migration tracking system for safe schema updates
- Compatible with both ESM and CommonJS environments
