/**
 * OpenIssues Page
 * Displays other open issues
 */

import { useState } from 'react';
import { Issue } from '../../types/issue';
import { IssueList } from '../components/IssueList';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { SortSelect } from '../components/SortSelect';
import { IssueDetailModal } from '../components/IssueDetailModal';
import { useCategoryPage } from '../hooks/useCategoryPage';
import './CategoryPage.css';

export function OpenIssues() {
  const { issues, loading, error, filters, setFilters, sortBy, setSortBy } =
    useCategoryPage('open');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const handleSearchChange = (search: string) => {
    setFilters({ ...filters, search: search || undefined });
  };

  return (
    <div className="category-page">
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-icon">📋</span>
          Other Open Issues
        </h1>
        <p className="page-description">
          All your other open issues
        </p>
      </div>

      <div className="page-content">
        <SearchBar
          value={filters.search || ''}
          onChange={handleSearchChange}
          placeholder="Search open issues..."
        />

        <FilterBar filters={filters} onChange={setFilters} />

        <div className="page-toolbar">
          <div className="toolbar-left">
            <span className="issue-count">
              {loading ? '...' : `${issues.length} issue${issues.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="toolbar-right">
            <SortSelect value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        <IssueList
          issues={issues}
          loading={loading}
          error={error}
          onIssueClick={setSelectedIssue}
        />
      </div>

      <IssueDetailModal issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </div>
  );
}
