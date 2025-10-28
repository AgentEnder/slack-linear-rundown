/**
 * Add missing columns to User table
 *
 * This migration adds:
 * - linear_user_id
 * - slack_real_name (renaming real_name)
 * - linear_name
 * - is_active (renaming is_bot logic)
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Add linear_user_id column
  await queryInterface.addColumn('User', 'linear_user_id', {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  });

  // Rename real_name to slack_real_name
  await queryInterface.renameColumn('User', 'real_name', 'slack_real_name');

  // Add linear_name column
  await queryInterface.addColumn('User', 'linear_name', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  // Rename is_bot to is_active and invert the logic
  // First add the new column
  await queryInterface.addColumn('User', 'is_active', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  // Copy inverted values from is_bot to is_active (is_active = NOT is_bot)
  await queryInterface.sequelize.query(
    'UPDATE User SET is_active = CASE WHEN is_bot = 1 THEN 0 ELSE 1 END'
  );

  // Remove is_bot column
  await queryInterface.removeColumn('User', 'is_bot');

  // Make slack_user_id nullable (it was NOT NULL before)
  await queryInterface.changeColumn('User', 'slack_user_id', {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  });

  // Add indexes for new columns
  await queryInterface.addIndex('User', ['linear_user_id'], {
    name: 'idx_users_linear_user_id',
    unique: true,
  });

  await queryInterface.addIndex('User', ['is_active'], {
    name: 'idx_users_is_active',
  });
}

export async function down({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Remove indexes
  await queryInterface.removeIndex('User', 'idx_users_linear_user_id');
  await queryInterface.removeIndex('User', 'idx_users_is_active');

  // Add back is_bot column
  await queryInterface.addColumn('User', 'is_bot', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // Copy inverted values back
  await queryInterface.sequelize.query(
    'UPDATE User SET is_bot = CASE WHEN is_active = 1 THEN 0 ELSE 1 END'
  );

  // Remove is_active
  await queryInterface.removeColumn('User', 'is_active');

  // Make slack_user_id NOT NULL again
  await queryInterface.changeColumn('User', 'slack_user_id', {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  });

  // Remove linear_name
  await queryInterface.removeColumn('User', 'linear_name');

  // Rename slack_real_name back to real_name
  await queryInterface.renameColumn('User', 'slack_real_name', 'real_name');

  // Remove linear_user_id
  await queryInterface.removeColumn('User', 'linear_user_id');
}
