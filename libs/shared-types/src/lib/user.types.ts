/**
 * User-related types
 */

export interface User {
  id: number;
  email: string;
  slack_user_id: string | null;
  slack_real_name: string | null;
  linear_user_id: string | null;
  linear_name: string | null;
  is_active: boolean;
  receive_reports: boolean;
  created_at: string;
  updated_at: string;
}

export interface MappingStatus {
  text: 'Fully Mapped' | 'Slack Only' | 'Linear Only' | 'Unmapped';
  status: 'success' | 'warning' | 'error';
}

export type SortField = 'name' | 'email' | 'mapping' | 'active';
export type SortDirection = 'asc' | 'desc';
