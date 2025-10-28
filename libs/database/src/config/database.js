/**
 * Sequelize CLI configuration
 *
 * This file is used by sequelize-cli for migrations and seeders.
 * For programmatic usage, use the Sequelize instance from db.ts
 */

import { isAbsolute, join } from 'path';
import { config } from 'dotenv';

const envFiles = ['.env', '.env.local'];
const env = {};

for (const envFile of envFiles) {
  try {
    config({
      path: join(process.cwd(), envFile),
      processEnv: env,
      override: true,
    });
  } catch {
    // Ignore missing env files
  }
}

for (const key of Object.keys(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = env[key];
  }
}

const databasePath = isAbsolute(process.env.DATABASE_PATH)
  ? process.env.DATABASE_PATH
  : join(process.cwd(), 'data/rundown.db');

export default {
  development: {
    dialect: 'sqlite',
    storage: databasePath,
    logging: console.log,
  },

  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },

  production: {
    dialect: 'sqlite',
    storage: databasePath,
    logging: false,
  },
};
