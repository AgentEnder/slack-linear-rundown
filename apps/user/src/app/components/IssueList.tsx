/**
 * IssueList Component
 * Displays a list of issues
 */

import { Issue } from '../../types/issue';
import { IssueCard } from './IssueCard';
import './IssueList.css';

interface IssueListProps {
  issues: Issue[];
  loading?: boolean;
  error?: string | null;
  onIssueClick?: (issue: Issue) => void;
}

export function IssueList({ issues, loading, error, onIssueClick }: IssueListProps) {
  if (loading) {
    return (
      <div className="issue-list-state">
        <div className="loading-spinner"></div>
        <p>Loading issues...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="issue-list-state error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Issues</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="issue-list-state empty">
        <div className="empty-icon">📭</div>
        <h3>No Issues Found</h3>
        <p>There are no issues in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="issue-list">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} onClick={onIssueClick} />
      ))}
    </div>
  );
}
