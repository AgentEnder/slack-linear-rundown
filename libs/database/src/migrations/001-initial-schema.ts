/**
 * Initial database schema migration
 *
 * Creates all tables for the Slack-Linear Rundown application:
 * - users: Slack users and their preferences
 * - cooldown_schedules: User vacation/cooldown periods
 * - report_delivery_log: History of report deliveries
 * - app_config: Simple key-value configuration storage
 * - encrypted_config: Encrypted configuration storage
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Create users table
  await queryInterface.createTable('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    slack_user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    real_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_bot: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    receive_reports: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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

  // Create index on slack_user_id for faster lookups
  await queryInterface.addIndex('User', ['slack_user_id'], {
    name: 'idx_users_slack_user_id',
    unique: true,
  });

  // Create cooldown_schedules table
  await queryInterface.createTable('CooldownSchedule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
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
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
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

  // Create index on user_id for faster lookups
  await queryInterface.addIndex('CooldownSchedule', ['user_id'], {
    name: 'idx_cooldown_schedules_user_id',
  });

  // Create report_delivery_log table
  await queryInterface.createTable('ReportDeliveryLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
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
    status: {
      type: DataTypes.ENUM('success', 'failure', 'skipped'),
      allowNull: false,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
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

  // Create indexes for report delivery log
  await queryInterface.addIndex('ReportDeliveryLog', ['user_id'], {
    name: 'idx_report_delivery_log_user_id',
  });
  await queryInterface.addIndex('ReportDeliveryLog', ['sent_at'], {
    name: 'idx_report_delivery_log_sent_at',
  });

  // Create app_config table
  await queryInterface.createTable('AppConfig', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
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

  // Create encrypted_config table
  await queryInterface.createTable('EncryptedConfig', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    encrypted_value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    iv: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    auth_tag: {
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
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  // Drop tables in reverse order (to handle foreign keys)
  await queryInterface.dropTable('EncryptedConfig');
  await queryInterface.dropTable('AppConfig');
  await queryInterface.dropTable('ReportDeliveryLog');
  await queryInterface.dropTable('CooldownSchedule');
  await queryInterface.dropTable('User');
}
