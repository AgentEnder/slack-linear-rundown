/**
 * API request and response types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AlertMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export interface PreviewReportResponse {
  reportPreview: string;
  issuesCount: number;
  inCooldown: boolean;
}

export interface TriggerReportResponse {
  message: string;
  issuesCount: number;
  inCooldown: boolean;
}
