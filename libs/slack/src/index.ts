// Export types
export type {
  SlackUser,
  SlackMessage,
  SlackDeliveryResult,
  UserReport,
  Issue,
  CooldownStatus,
} from './lib/types.js';

// Export client
export { SlackClient } from './lib/slack-client.js';
export type { SlackClientConfig } from './lib/slack-client.js';

// Export formatters
export {
  formatWeeklyReport,
  formatCooldownBanner,
  aggregateIssuesByPriority,
  buildLinearSearchUrl,
  buildLinearIssueUrl,
} from './lib/formatters.js';

export type { LinearFilterType } from './lib/formatters.js';
