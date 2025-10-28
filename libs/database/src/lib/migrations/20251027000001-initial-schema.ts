import { QueryInterface, DataTypes } from 'sequelize';

export default {
  async up(queryInterface: QueryInterface) {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      slack_user_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      linear_user_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      slack_real_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      linear_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      receive_reports: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    // Create indexes for users table
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['slack_user_id']);
    await queryInterface.addIndex('users', ['linear_user_id']);
    await queryInterface.addIndex('users', ['receive_reports']);

    // Create cooldown_schedules table
    await queryInterface.createTable('cooldown_schedules', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      next_cooldown_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      cooldown_duration_weeks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
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

    // Create indexes for cooldown_schedules table
    await queryInterface.addIndex('cooldown_schedules', ['user_id']);
    await queryInterface.addIndex('cooldown_schedules', ['next_cooldown_start']);

    // Create report_delivery_log table
    await queryInterface.createTable('report_delivery_log', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('success', 'failed', 'skipped'),
        allowNull: false,
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      report_period_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      report_period_end: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      issues_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      in_cooldown: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    });

    // Create indexes for report_delivery_log table
    await queryInterface.addIndex('report_delivery_log', ['user_id']);
    await queryInterface.addIndex('report_delivery_log', ['sent_at']);

    // Create app_config table
    await queryInterface.createTable('app_config', {
      key: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    // Create encrypted_config table
    await queryInterface.createTable('encrypted_config', {
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
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.dropTable('report_delivery_log');
    await queryInterface.dropTable('cooldown_schedules');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('app_config');
    await queryInterface.dropTable('encrypted_config');
  },
};
