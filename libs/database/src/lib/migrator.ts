/**
 * Database migration system using Umzug
 */

import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize, QueryInterface, DataTypes } from 'sequelize';

// Get directory name - works in both CJS and ESM
const getDirname = (): string => {
  // try {
  // In ESM, use import.meta.url
  // const __filename = fileURLToPath(import.meta.url);
  // return path.dirname(__filename);
  // } catch {
  // In CJS, __dirname is already available
  return eval('__dirname');
  // }
};

const migratorDir = getDirname();

/**
 * Migration context passed to each migration
 */
export interface MigrationContext {
  queryInterface: QueryInterface;
  Sequelize: typeof Sequelize;
  DataTypes: typeof DataTypes;
}

/**
 * Create and configure the Umzug migrator instance
 */
export function createMigrator(sequelize: Sequelize): Umzug<MigrationContext> {
  const migrator = new Umzug<MigrationContext>({
    migrations: {
      // Migrations are stored in the migrations directory (compiled .js files)
      glob: ['../migrations/*.js', { cwd: migratorDir }],
      resolve: ({ name, path: filepath }) => ({
        name,
        up: async () => {
          // Dynamic import the migration file
          const migration = await import(filepath!);
          return migration.up({
            queryInterface: sequelize.getQueryInterface(),
            Sequelize,
            DataTypes,
          });
        },
        down: async () => {
          const migration = await import(filepath!);
          if (migration.down) {
            return migration.down({
              queryInterface: sequelize.getQueryInterface(),
              Sequelize,
              DataTypes,
            });
          }
        },
      }),
    },
    context: {
      queryInterface: sequelize.getQueryInterface(),
      Sequelize,
      DataTypes,
    },
    storage: new SequelizeStorage({
      sequelize,
      tableName: 'sequelize_meta',
    }),
    logger: console,
  });

  return migrator;
}
