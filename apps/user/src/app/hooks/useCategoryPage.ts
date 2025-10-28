/**
 * useCategoryPage Hook
 * Shared logic for category pages (filtering, sorting, fetching)
 */

import { useState, useEffect, useMemo } from 'react';
import { Issue, Filters, Category } from '../../types/issue';
import { fetchIssues } from '../../utils/api';
import { SortOption } from '../components/SortSelect';

export function useCategoryPage(category: Category) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<SortOption>('updated-desc');

  useEffect(() => {
    loadIssues();
  }, [filters, category]);

  async function loadIssues() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchIssues(category, filters);
      setIssues(response.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  }

  // Client-side sorting
  const sortedIssues = useMemo(() => {
    const sorted = [...issues];

    switch (sortBy) {
      case 'updated-desc':
        return sorted.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      case 'updated-asc':
        return sorted.sort(
          (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        );
      case 'priority-desc':
        return sorted.sort((a, b) => {
          const priorityA = a.priority ?? 999;
          const priorityB = b.priority ?? 999;
          return priorityA - priorityB; // Lower number = higher priority
        });
      case 'priority-asc':
        return sorted.sort((a, b) => {
          const priorityA = a.priority ?? 999;
          const priorityB = b.priority ?? 999;
          return priorityB - priorityA;
        });
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      default:
        return sorted;
    }
  }, [issues, sortBy]);

  return {
    issues: sortedIssues,
    loading,
    error,
    filters,
    setFilters,
    sortBy,
    setSortBy,
  };
}
