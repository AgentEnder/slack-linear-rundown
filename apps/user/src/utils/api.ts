/**
 * API Client for User App
 */

import { Category, Filters, IssuesResponse, FilterOptions, User } from '../types/issue';

const API_BASE = '/api';

/**
 * Fetch issues by category
 */
export async function fetchIssues(
  category: Category,
  filters: Filters = {}
): Promise<IssuesResponse> {
  const params = new URLSearchParams();

  if (filters.projectId) params.append('projectId', filters.projectId);
  if (filters.teamId) params.append('teamId', filters.teamId);
  if (filters.priority !== undefined) params.append('priority', String(filters.priority));
  if (filters.stateType) params.append('stateType', filters.stateType);
  if (filters.search) params.append('search', filters.search);

  const url = `${API_BASE}/user/issues/${category}${params.toString() ? `?${params}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'X-User-ID': getUserIdFromStorage() || '1', // For development
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch issues: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch filter options
 */
export async function fetchFilterOptions(): Promise<FilterOptions> {
  const response = await fetch(`${API_BASE}/user/filter-options`, {
    credentials: 'include',
    headers: {
      'X-User-ID': getUserIdFromStorage() || '1', // For development
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filter options: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch current user
 */
export async function fetchCurrentUser(): Promise<User> {
  const response = await fetch(`${API_BASE}/user/me`, {
    credentials: 'include',
    headers: {
      'X-User-ID': getUserIdFromStorage() || '1', // For development
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user ID from localStorage (for development)
 * In production, this would come from Slack OAuth
 */
function getUserIdFromStorage(): string | null {
  return localStorage.getItem('userId');
}

/**
 * Set user ID in localStorage (for development)
 */
export function setUserId(userId: string): void {
  localStorage.setItem('userId', userId);
}
