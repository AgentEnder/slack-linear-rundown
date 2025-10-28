/**
 * Database library for Slack-Linear Rundown.
 *
 * This library provides Sequelize ORM database functionality including:
 * - Database connection management
 * - Sequelize models with TypeScript support
 * - Migration system with Umzug
 * - Direct model access for data operations
 */

// Database connection and management
export {
  initializeDatabase,
  getDatabase,
  closeDatabase,
  runMigrations,
  resetDatabase,
} from './lib/db.js';

// Migration system
export {
  createMigrator,
  type MigrationContext,
} from './lib/migrator.js';

// Sequelize Models (direct access)
export {
  User,
  CooldownSchedule,
  ReportDeliveryLog,
  ReportStatus,
  AppConfig,
  EncryptedConfig,
  Issue,
  UserIssueSnapshot,
} from './lib/models/index.js';

// Encryption utilities
export {
  encrypt,
  decrypt,
  validateEncryptionKey,
  generateKey,
  type EncryptedData,
} from './lib/encryption.js';

// Encrypted Config Service
export * as EncryptedConfigService from './lib/services/encrypted-config.service.js';
