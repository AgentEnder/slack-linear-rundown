/**
 * Migration: Add issue persistence for user-facing app
 * Created: 2025-10-28
 *
 * Creates two tables:
 * - issues: Stores Linear issue snapshots
 * - user_issue_snapshots: Tracks which issues appeared in which user's report
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Create issues table
  await queryInterface.createTable('Issue', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Linear identifiers
    linear_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    identifier: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    // Issue data
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '0-4 (None, Urgent, High, Medium, Low)',
    },
    estimate: {
      type: DataTypes.REAL,
      allowNull: true,
    },

    // Status
    state_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    state_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'started, unstarted, completed, canceled',
    },

    // Timestamps from Linear
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    canceled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Project/Team
    project_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    project_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    team_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    team_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    team_key: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // Tracking
    first_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_synced_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Add indexes for performance
  await queryInterface.addIndex('Issue', ['linear_id'], {
    name: 'idx_issue_linear_id',
  });
  await queryInterface.addIndex('Issue', ['identifier'], {
    name: 'idx_issue_identifier',
  });
  await queryInterface.addIndex('Issue', ['state_type'], {
    name: 'idx_issue_state_type',
  });
  await queryInterface.addIndex('Issue', ['updated_at'], {
    name: 'idx_issue_updated_at',
  });
  await queryInterface.addIndex('Issue', ['team_id'], {
    name: 'idx_issue_team_id',
  });
  await queryInterface.addIndex('Issue', ['project_id'], {
    name: 'idx_issue_project_id',
  });

  // Create user_issue_snapshots table
  await queryInterface.createTable('UserIssueSnapshot', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // User reference
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'User',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // Issue reference
    issue_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Issue',
        key: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },

    // Snapshot metadata
    snapshot_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    report_period_start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    report_period_end: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Categorization in report
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'completed, started, updated, open',
    },

    // Issue state at snapshot time (for historical accuracy)
    state_type_snapshot: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    priority_snapshot: {
      type: DataTypes.INTEGER,
      allowNull: true,
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

  // Add indexes for UserIssueSnapshot
  await queryInterface.addIndex('UserIssueSnapshot', ['user_id'], {
    name: 'idx_user_issue_snapshot_user_id',
  });
  await queryInterface.addIndex('UserIssueSnapshot', ['issue_id'], {
    name: 'idx_user_issue_snapshot_issue_id',
  });
  await queryInterface.addIndex('UserIssueSnapshot', ['snapshot_date'], {
    name: 'idx_user_issue_snapshot_date',
  });
  await queryInterface.addIndex('UserIssueSnapshot', ['category'], {
    name: 'idx_user_issue_snapshot_category',
  });
  await queryInterface.addIndex('UserIssueSnapshot', ['user_id', 'issue_id', 'snapshot_date'], {
    name: 'idx_user_issue_snapshot_unique',
    unique: true,
  });
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  // Drop tables in reverse order (to handle foreign keys)
  await queryInterface.dropTable('UserIssueSnapshot');
  await queryInterface.dropTable('Issue');
}
