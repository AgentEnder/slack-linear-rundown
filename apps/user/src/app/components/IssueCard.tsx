/**
 * IssueCard Component
 * Displays a single issue with all its details
 */

import { Issue, PRIORITY_LABELS, PRIORITY_COLORS } from '../../types/issue';
import { formatRelativeTime, truncate, getLinearIssueUrl } from '../../utils/format';
import './IssueCard.css';

interface IssueCardProps {
  issue: Issue;
  onClick?: (issue: Issue) => void;
}

export function IssueCard({ issue, onClick }: IssueCardProps) {
  const linearUrl = issue.team_key
    ? getLinearIssueUrl(issue.team_key, issue.identifier)
    : '#';

  const priorityLabel = issue.priority !== undefined ? PRIORITY_LABELS[issue.priority] : null;
  const priorityColor = issue.priority !== undefined ? PRIORITY_COLORS[issue.priority] : '#64748b';

  return (
    <div
      className={`issue-card ${onClick ? 'clickable' : ''}`}
      onClick={() => onClick?.(issue)}
    >
      <div className="issue-card-header">
        <a
          href={linearUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="issue-identifier"
        >
          {issue.identifier}
        </a>
        <div className="issue-badges">
          {priorityLabel && (
            <span
              className="issue-badge priority-badge"
              style={{ backgroundColor: priorityColor }}
            >
              {priorityLabel}
            </span>
          )}
          {issue.state_name && (
            <span className="issue-badge state-badge">{issue.state_name}</span>
          )}
        </div>
      </div>

      <h3 className="issue-title">{issue.title}</h3>

      {issue.description && (
        <p className="issue-description">{truncate(issue.description, 200)}</p>
      )}

      <div className="issue-meta">
        {issue.project_name && (
          <span className="meta-item">
            <span className="meta-icon">📁</span>
            {issue.project_name}
          </span>
        )}
        {issue.team_name && (
          <span className="meta-item">
            <span className="meta-icon">👥</span>
            {issue.team_name}
          </span>
        )}
        {issue.estimate && (
          <span className="meta-item">
            <span className="meta-icon">⏱️</span>
            {issue.estimate} pts
          </span>
        )}
      </div>

      <div className="issue-footer">
        <span className="issue-timestamp">
          Updated {formatRelativeTime(issue.updated_at)}
        </span>
      </div>
    </div>
  );
}
