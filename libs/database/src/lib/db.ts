/**
 * Database connection manager using Sequelize ORM.
 *
 * This module initializes the database connection, runs migrations,
 * and provides access to the Sequelize instance.
 */

import { Sequelize } from 'sequelize-typescript';
import { User } from './models/User.model.js';
import { CooldownSchedule } from './models/CooldownSchedule.model.js';
import { ReportDeliveryLog } from './models/ReportDeliveryLog.model.js';
import { AppConfig } from './models/AppConfig.model.js';
import { EncryptedConfig } from './models/EncryptedConfig.model.js';
import { Issue } from './models/Issue.model.js';
import { UserIssueSnapshot } from './models/UserIssueSnapshot.model.js';
import { Repository } from './models/Repository.model.js';
import { GitHubPullRequest } from './models/GitHubPullRequest.model.js';
import { GitHubIssue } from './models/GitHubIssue.model.js';
import { GitHubCodeReview } from './models/GitHubCodeReview.model.js';
import { UserGitHubSnapshot } from './models/UserGitHubSnapshot.model.js';
import { IssueGitHubLink } from './models/IssueGitHubLink.model.js';
import { SyncStatus } from './models/SyncStatus.model.js';

let sequelizeInstance: Sequelize | null = null;

/**
 * Initialize the database connection using Sequelize.
 *
 * @param databasePath - Path to the SQLite database file. Defaults to ':memory:' for testing.
 * @returns The initialized Sequelize instance
 */
export function initializeDatabase(databasePath: string = ':memory:'): Sequelize {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  try {
    sequelizeInstance = new Sequelize({
      dialect: 'sqlite',
      storage: databasePath,
      models: [
        User,
        CooldownSchedule,
        ReportDeliveryLog,
        AppConfig,
        EncryptedConfig,
        Issue,
        UserIssueSnapshot,
        Repository,
        GitHubPullRequest,
        GitHubIssue,
        GitHubCodeReview,
        UserGitHubSnapshot,
        IssueGitHubLink,
        SyncStatus,
      ],
      logging: false, // Set to console.log to see SQL queries
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    });

    return sequelizeInstance;
  } catch (error) {
    throw new Error(
      `Failed to initialize Sequelize: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get the current Sequelize instance.
 * Throws an error if the database has not been initialized.
 *
 * @returns The Sequelize instance
 */
export function getDatabase(): Sequelize {
  if (!sequelizeInstance) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return sequelizeInstance;
}

/**
 * Close the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (sequelizeInstance) {
    await sequelizeInstance.close();
    sequelizeInstance = null;
  }
}

/**
 * Run database migrations.
 *
 * Uses Umzug to run pending migrations from the migrations directory.
 */
export async function runMigrations(): Promise<void> {
  try {
    const sequelize = getDatabase();

    // First, test the connection
    await sequelize.authenticate();
    console.log('Database connection authenticated');

    // Create migrator and run pending migrations
    const { createMigrator } = await import('./migrator.js');
    const migrator = createMigrator(sequelize);

    console.log('Running pending migrations...');
    const migrations = await migrator.up();

    if (migrations.length === 0) {
      console.log('No pending migrations to run');
    } else {
      console.log(`Successfully ran ${migrations.length} migration(s):`, migrations.map(m => m.name));
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to run database migrations: ${error.message}\nStack: ${error.stack}`
      );
    }
    throw new Error(`Failed to run database migrations: ${String(error)}`);
  }
}

/**
 * Reset the database (for testing purposes).
 * Drops all tables and re-runs migrations.
 */
export async function resetDatabase(): Promise<void> {
  const sequelize = getDatabase();

  // Drop all tables
  await sequelize.drop();

  // Re-sync
  await sequelize.sync();
}

/**
 * Get the User model for direct queries.
 * This is a convenience export for backward compatibility.
 */
export function getUserModel() {
  return User;
}

/**
 * Get the CooldownSchedule model for direct queries.
 */
export function getCooldownScheduleModel() {
  return CooldownSchedule;
}

/**
 * Get the ReportDeliveryLog model for direct queries.
 */
export function getReportDeliveryLogModel() {
  return ReportDeliveryLog;
}

/**
 * Get the AppConfig model for direct queries.
 */
export function getAppConfigModel() {
  return AppConfig;
}

/**
 * Get the EncryptedConfig model for direct queries.
 */
export function getEncryptedConfigModel() {
  return EncryptedConfig;
}

/**
 * Get the Issue model for direct queries.
 */
export function getIssueModel() {
  return Issue;
}

/**
 * Get the UserIssueSnapshot model for direct queries.
 */
export function getUserIssueSnapshotModel() {
  return UserIssueSnapshot;
}

/**
 * Get the Repository model for direct queries.
 */
export function getRepositoryModel() {
  return Repository;
}

/**
 * Get the GitHubPullRequest model for direct queries.
 */
export function getGitHubPullRequestModel() {
  return GitHubPullRequest;
}

/**
 * Get the GitHubIssue model for direct queries.
 */
export function getGitHubIssueModel() {
  return GitHubIssue;
}

/**
 * Get the GitHubCodeReview model for direct queries.
 */
export function getGitHubCodeReviewModel() {
  return GitHubCodeReview;
}

/**
 * Get the UserGitHubSnapshot model for direct queries.
 */
export function getUserGitHubSnapshotModel() {
  return UserGitHubSnapshot;
}

/**
 * Get the IssueGitHubLink model for direct queries.
 */
export function getIssueGitHubLinkModel() {
  return IssueGitHubLink;
}

/**
 * Get the SyncStatus model for direct queries.
 */
export function getSyncStatusModel() {
  return SyncStatus;
}
