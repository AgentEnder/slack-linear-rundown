#!/usr/bin/env node
/**
 * Database migration CLI tool
 *
 * Usage:
 *   pnpm db:migrate up              - Run all pending migrations
 *   pnpm db:migrate down            - Rollback the last migration
 *   pnpm db:migrate status          - Show migration status
 *   pnpm db:migrate create <name>   - Create a new migration file
 */

import path from 'path';
import fs from 'fs/promises';
import { initializeDatabase, createMigrator } from '../index.js';

// Get directory name - works in both CJS and ESM
const getDirname = (): string => {
  // In CJS, __dirname is already available
  return eval('__dirname');
};

const cliDir = getDirname();

const DATABASE_PATH = process.env.DATABASE_PATH || './data/rundown.db';

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command) {
    console.error('Usage: migrate <command> [args]');
    console.error('Commands: up, down, status, create <name>');
    process.exit(1);
  }

  try {
    // Initialize database connection
    const sequelize = initializeDatabase(DATABASE_PATH);
    await sequelize.authenticate();
    console.log(`Connected to database: ${DATABASE_PATH}\n`);

    const migrator = createMigrator(sequelize);

    switch (command) {
      case 'up': {
        console.log('Running pending migrations...');
        const migrations = await migrator.up();
        if (migrations.length === 0) {
          console.log('✓ No pending migrations');
        } else {
          console.log(`✓ Successfully ran ${migrations.length} migration(s):`);
          migrations.forEach((m) => console.log(`  - ${m.name}`));
        }
        break;
      }

      case 'down': {
        console.log('Rolling back last migration...');
        const migrations = await migrator.down();
        if (migrations.length === 0) {
          console.log('✓ No migrations to roll back');
        } else {
          console.log(`✓ Rolled back:`);
          migrations.forEach((m) => console.log(`  - ${m.name}`));
        }
        break;
      }

      case 'status': {
        console.log('Migration Status:\n');
        const executed = await migrator.executed();
        const pending = await migrator.pending();

        console.log('Executed migrations:');
        if (executed.length === 0) {
          console.log('  (none)');
        } else {
          executed.forEach((m) => console.log(`  ✓ ${m.name}`));
        }

        console.log('\nPending migrations:');
        if (pending.length === 0) {
          console.log('  (none)');
        } else {
          pending.forEach((m) => console.log(`  ○ ${m.name}`));
        }
        break;
      }

      case 'create': {
        if (args.length === 0) {
          console.error('Error: Migration name is required');
          console.error('Usage: migrate create <migration-name>');
          process.exit(1);
        }

        const migrationName = args[0];
        const timestamp = new Date()
          .toISOString()
          .replace(/[-:\.]/g, '')
          .slice(0, 14);
        const fileName = `${timestamp}-${migrationName}.ts`;
        const migrationsDir = path.join(cliDir, '../../migrations');
        const filePath = path.join(migrationsDir, fileName);

        const template = `/**
 * Migration: ${migrationName}
 *
 * Created: ${new Date().toISOString()}
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Write migration code here
  // Example:
  // await queryInterface.addColumn('User', 'new_column', {
  //   type: DataTypes.STRING,
  //   allowNull: true,
  // });
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  // Write rollback code here
  // Example:
  // await queryInterface.removeColumn('User', 'new_column');
}
`;

        await fs.writeFile(filePath, template, 'utf-8');
        console.log(`✓ Created migration: ${fileName}`);
        console.log(`  Path: ${filePath}`);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Available commands: up, down, status, create');
        process.exit(1);
    }

    await sequelize.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
