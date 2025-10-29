import { QueryInterface, DataTypes } from 'sequelize';

/**
 * Migration: Add GitHub OAuth Token Fields to User Table
 *
 * Adds fields to store user-specific GitHub OAuth tokens for the GitHub App integration.
 * Tokens are encrypted at rest using the application's ENCRYPTION_KEY.
 */
export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('User', 'github_access_token', {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted GitHub OAuth access token',
  });

  await queryInterface.addColumn('User', 'github_refresh_token', {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encrypted GitHub OAuth refresh token (for GitHub Apps)',
  });

  await queryInterface.addColumn('User', 'github_token_expires_at', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the GitHub access token expires',
  });

  await queryInterface.addColumn('User', 'github_connected_at', {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the user first connected their GitHub account',
  });

  await queryInterface.addColumn('User', 'github_scopes', {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Space-separated list of granted OAuth scopes',
  });

  // Add index on github_connected_at for querying connected users
  await queryInterface.addIndex('User', ['github_connected_at'], {
    name: 'idx_user_github_connected_at',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('User', 'idx_user_github_connected_at');
  await queryInterface.removeColumn('User', 'github_scopes');
  await queryInterface.removeColumn('User', 'github_connected_at');
  await queryInterface.removeColumn('User', 'github_token_expires_at');
  await queryInterface.removeColumn('User', 'github_refresh_token');
  await queryInterface.removeColumn('User', 'github_access_token');
}
