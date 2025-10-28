# Database Migrations

This project supports two migration approaches:

1. **Umzug** (custom CLI) - Programmatic migrations with full TypeScript support
2. **Sequelize CLI** (standard) - The official Sequelize migration tool

## Option 1: Umzug (Custom TypeScript Migrations)

### Commands

```bash
# Check migration status
pnpm db:migrate:status

# Run all pending migrations
pnpm db:migrate:up

# Rollback the last migration
pnpm db:migrate:down

# Create a new migration file
pnpm db:migrate:create <migration-name>
```

## Option 2: Sequelize CLI (Standard)

The more standard approach using the official `sequelize-cli` tool.

### Commands

```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Run all pending migrations
npx sequelize-cli db:migrate

# Rollback the last migration
npx sequelize-cli db:migrate:undo

# Rollback all migrations
npx sequelize-cli db:migrate:undo:all

# Create a new migration file
npx sequelize-cli migration:generate --name <migration-name>
```

### Configuration

Sequelize CLI is configured via `.sequelizerc` in the project root and uses:
- **Migrations:** `libs/database/src/migrations-sequelize/`
- **Config:** `libs/database/src/config/database.js`
- **Models:** `libs/database/src/lib/models/`

## Creating New Migrations

1. **Generate a migration file**:
   ```bash
   pnpm db:migrate:create add-user-avatar
   ```
   This creates a timestamped file: `libs/database/src/migrations/20250127123456-add-user-avatar.ts`

2. **Edit the migration file**:
   ```typescript
   import { MigrationContext } from '../lib/migrator.js';

   export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
     await queryInterface.addColumn('User', 'avatar_url', {
       type: DataTypes.STRING,
       allowNull: true,
     });
   }

   export async function down({ queryInterface }: MigrationContext): Promise<void> {
     await queryInterface.removeColumn('User', 'avatar_url');
   }
   ```

3. **Build the database library**:
   ```bash
   pnpm db:build
   ```

4. **Run the migration**:
   ```bash
   pnpm db:migrate:up
   ```

## Migration Best Practices

### 1. Always Write `down()` Functions
Every migration should have a reversible `down()` function for rolling back changes.

### 2. Test Migrations Locally First
Always test migrations on your local database before deploying to production.

### 3. Never Modify Executed Migrations
Once a migration has been run in any environment, never modify it. Create a new migration instead.

### 4. Keep Migrations Small and Focused
Each migration should do one thing. This makes them easier to understand and debug.

### 5. Handle Data Migrations Carefully
When migrating data:
- Use transactions where possible
- Test with production-like data volumes
- Consider performance implications

## Common Migration Operations

### Adding a Column
```typescript
await queryInterface.addColumn('TableName', 'column_name', {
  type: DataTypes.STRING,
  allowNull: false,
  defaultValue: 'default',
});
```

### Removing a Column
```typescript
await queryInterface.removeColumn('TableName', 'column_name');
```

### Creating an Index
```typescript
await queryInterface.addIndex('TableName', ['column_name'], {
  name: 'idx_table_column',
  unique: false,
});
```

### Creating a Table
```typescript
await queryInterface.createTable('NewTable', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
});
```

### Modifying a Column
```typescript
await queryInterface.changeColumn('TableName', 'column_name', {
  type: DataTypes.TEXT, // Changed from STRING to TEXT
  allowNull: true,
});
```

## Migration Tracking

Migrations are tracked in the `sequelize_meta` table. This table stores the names of all executed migrations.

**Never manually modify this table** unless you know exactly what you're doing.

## Development vs Production

### Development
During development, you can:
- Run migrations up and down freely
- Delete and recreate your database
- Experiment with migration changes

### Production
In production:
- Always run `pnpm db:migrate:status` first
- Only run `pnpm db:migrate:up`
- Never run `down` migrations unless in an emergency
- Always back up your database before running migrations

## Troubleshooting

### Migration Fails Halfway Through
If a migration fails partway through:
1. Check the error message
2. Fix the issue in the migration file
3. You may need to manually rollback changes or clean up the database
4. Run the migration again

### Circular Dependency Errors
If you get circular dependency errors with models, use the lazy-loading pattern:
```typescript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const getUserModel = () => {
  return require('./User.model.js').User;
};
```

### Migration Shows as Pending But Was Run
Check the `sequelize_meta` table to see if it's actually recorded:
```sql
SELECT * FROM sequelize_meta;
```

## Deployment

When deploying:
1. Build the database library: `pnpm db:build`
2. Run migrations: `pnpm db:migrate:up`
3. Start the application

Consider adding migration runs to your deployment pipeline:
```bash
#!/bin/bash
pnpm db:build
pnpm db:migrate:up
pnpm build
pnpm start
```
