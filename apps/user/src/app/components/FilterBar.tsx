/**
 * FilterBar Component
 * Provides filtering controls for issues
 */

import { useState, useEffect } from 'react';
import { Filters, FilterOptions, PRIORITY_LABELS } from '../../types/issue';
import { fetchFilterOptions } from '../../utils/api';
import './FilterBar.css';

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    teams: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  async function loadFilterOptions() {
    try {
      const options = await fetchFilterOptions();
      setFilterOptions(options);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string | number | undefined) => {
    onChange({
      ...filters,
      [key]: value === '' || value === undefined ? undefined : value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ''
  );

  const handleClearFilters = () => {
    onChange({});
  };

  if (loading) {
    return (
      <div className="filter-bar loading">
        <span>Loading filters...</span>
      </div>
    );
  }

  return (
    <div className="filter-bar">
      <div className="filter-controls">
        {/* Project Filter */}
        {filterOptions.projects.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Project</label>
            <select
              className="filter-select"
              value={filters.projectId || ''}
              onChange={(e) => handleFilterChange('projectId', e.target.value)}
            >
              <option value="">All Projects</option>
              {filterOptions.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Team Filter */}
        {filterOptions.teams.length > 0 && (
          <div className="filter-group">
            <label className="filter-label">Team</label>
            <select
              className="filter-select"
              value={filters.teamId || ''}
              onChange={(e) => handleFilterChange('teamId', e.target.value)}
            >
              <option value="">All Teams</option>
              {filterOptions.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority Filter */}
        <div className="filter-group">
          <label className="filter-label">Priority</label>
          <select
            className="filter-select"
            value={filters.priority !== undefined ? filters.priority : ''}
            onChange={(e) =>
              handleFilterChange(
                'priority',
                e.target.value === '' ? undefined : Number(e.target.value)
              )
            }
          >
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button className="filter-clear-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <span className="active-filters-label">Active filters:</span>
          {filters.projectId && (
            <span className="filter-tag">
              📁{' '}
              {filterOptions.projects.find((p) => p.id === filters.projectId)?.name ||
                'Project'}
              <button
                className="filter-tag-remove"
                onClick={() => handleFilterChange('projectId', undefined)}
              >
                ✕
              </button>
            </span>
          )}
          {filters.teamId && (
            <span className="filter-tag">
              👥{' '}
              {filterOptions.teams.find((t) => t.id === filters.teamId)?.name || 'Team'}
              <button
                className="filter-tag-remove"
                onClick={() => handleFilterChange('teamId', undefined)}
              >
                ✕
              </button>
            </span>
          )}
          {filters.priority !== undefined && (
            <span className="filter-tag">
              🎯 {PRIORITY_LABELS[filters.priority]}
              <button
                className="filter-tag-remove"
                onClick={() => handleFilterChange('priority', undefined)}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
