/**
 * Tests for database connection and migration system.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  initializeDatabase,
  getDatabase,
  runMigrations,
  closeDatabase,
} from './db.js';
import { User } from './models/index.js';

describe('Database', () => {
  beforeEach(async () => {
    // Initialize in-memory database for testing
    await initializeDatabase(':memory:');
    await runMigrations();
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('should initialize database connection', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
  });

  it('should run migrations and create all tables', async () => {
    const db = getDatabase();

    // Check that all models are defined
    expect(db.models.User).toBeDefined();
    expect(db.models.CooldownSchedule).toBeDefined();
    expect(db.models.ReportDeliveryLog).toBeDefined();
    expect(db.models.AppConfig).toBeDefined();
    expect(db.models.EncryptedConfig).toBeDefined();

    // Verify we can query the tables
    const userCount = await User.count();
    expect(userCount).toBe(0);
  });

  it('should support database operations', async () => {
    // Create a test user
    const user = await User.create({
      slack_user_id: 'U123',
      email: 'test@example.com',
      real_name: 'Test User',
      is_bot: false,
      receive_reports: true,
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');

    // Verify we can find it
    const foundUser = await User.findByPk(user.id!);
    expect(foundUser).toBeDefined();
    expect(foundUser?.email).toBe('test@example.com');
  });
});
