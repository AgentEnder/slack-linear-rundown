/**
 * Migration: Add sync status tracking
 * Created: 2025-10-28
 *
 * Creates SyncStatus table to track when each sync type last ran
 * This provides visibility into data freshness for both admin and user apps
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Create SyncStatus table
  await queryInterface.createTable('SyncStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Type of sync (linear_issues, github_data, slack_users, etc.)
    sync_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },

    // Status
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'success, failed, in_progress',
    },

    // Timestamps
    last_started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_success_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_failed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Error tracking
    last_error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Stats
    total_runs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    success_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    failure_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Metadata (JSON)
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON object with sync-specific data (items synced, duration, etc.)',
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes
  await queryInterface.addIndex('SyncStatus', ['sync_type'], {
    name: 'idx_sync_status_type',
    unique: true,
  });
  await queryInterface.addIndex('SyncStatus', ['status'], {
    name: 'idx_sync_status_status',
  });
  await queryInterface.addIndex('SyncStatus', ['last_completed_at'], {
    name: 'idx_sync_status_last_completed',
  });

  // Insert initial sync types
  await queryInterface.bulkInsert('SyncStatus', [
    {
      sync_type: 'linear_issues',
      status: 'success',
      total_runs: 0,
      success_count: 0,
      failure_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      sync_type: 'github_data',
      status: 'success',
      total_runs: 0,
      success_count: 0,
      failure_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      sync_type: 'slack_users',
      status: 'success',
      total_runs: 0,
      success_count: 0,
      failure_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  await queryInterface.dropTable('SyncStatus');
}
