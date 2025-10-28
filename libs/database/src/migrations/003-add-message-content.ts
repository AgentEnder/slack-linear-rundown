/**
 * Add message_content column to ReportDeliveryLog table
 *
 * This migration adds:
 * - message_content: TEXT column to store the actual message content sent to Slack
 */

import { MigrationContext } from '../lib/migrator.js';

export async function up({ queryInterface, DataTypes }: MigrationContext): Promise<void> {
  // Add message_content column
  await queryInterface.addColumn('ReportDeliveryLog', 'message_content', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
}

export async function down({ queryInterface }: MigrationContext): Promise<void> {
  // Remove message_content column
  await queryInterface.removeColumn('ReportDeliveryLog', 'message_content');
}
