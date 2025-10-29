/**
 * Configuration and settings types
 */

export type ConfigKey =
  | 'SLACK_BOT_TOKEN'
  | 'LINEAR_API_KEY'
  | 'SLACK_SIGNING_SECRET'
  | 'REPORT_SCHEDULE';

export interface ConfigFormData {
  SLACK_BOT_TOKEN: string;
  LINEAR_API_KEY: string;
  SLACK_SIGNING_SECRET: string;
  REPORT_SCHEDULE: string;
}

export interface ConfigStatus {
  configured: boolean;
  source: 'database' | 'environment' | 'none';
  decryptionError: boolean;
  apiWorking: boolean | null;
  apiDetails: Record<string, string> | null;
  apiError: string | null;
}

export interface StatusResponse {
  SLACK_BOT_TOKEN: ConfigStatus;
  LINEAR_API_KEY: ConfigStatus;
  SLACK_SIGNING_SECRET: ConfigStatus;
  REPORT_SCHEDULE: ConfigStatus;
}
