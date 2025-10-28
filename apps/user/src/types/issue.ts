/**
 * Type definitions for Issues from the API
 */

export interface Issue {
  id: number;
  linear_id: string;
  identifier: string;
  title: string;
  description?: string;
  priority?: number;
  estimate?: number;
  state_id?: string;
  state_name?: string;
  state_type?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  canceled_at?: string;
  project_id?: string;
  project_name?: string;
  team_id?: string;
  team_name?: string;
  team_key?: string;
  first_synced_at: string;
  last_synced_at: string;
}

export interface IssuesResponse {
  issues: Issue[];
  count: number;
  category: string;
  filters: Filters;
}

export interface Filters {
  projectId?: string;
  teamId?: string;
  priority?: number;
  stateType?: string;
  search?: string;
}

export interface FilterOptions {
  projects: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; key: string }>;
}

export interface User {
  id: number;
  email: string;
  name: string;
  linearUserId?: string;
  slackUserId?: string;
}

export type Category = 'completed' | 'started' | 'updated' | 'open';

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: '#64748b',
  1: '#ef4444',
  2: '#f97316',
  3: '#eab308',
  4: '#22c55e',
};
