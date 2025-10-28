/**
 * IssueDetailModal Component
 * Displays full issue details in a modal
 */

import { Issue, PRIORITY_LABELS, PRIORITY_COLORS } from '../../types/issue';
import { formatShortDate, getLinearIssueUrl } from '../../utils/format';
import './IssueDetailModal.css';

interface IssueDetailModalProps {
  issue: Issue | null;
  onClose: () => void;
}

export function IssueDetailModal({ issue, onClose }: IssueDetailModalProps) {
  if (!issue) return null;

  const linearUrl = issue.team_key
    ? getLinearIssueUrl(issue.team_key, issue.identifier)
    : '#';

  const priorityLabel = issue.priority !== undefined ? PRIORITY_LABELS[issue.priority] : null;
  const priorityColor = issue.priority !== undefined ? PRIORITY_COLORS[issue.priority] : '#64748b';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-header-top">
            <a
              href={linearUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="modal-identifier"
            >
              {issue.identifier} →
            </a>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <h2 className="modal-title">{issue.title}</h2>
        </div>

        <div className="modal-body">
          {/* Badges */}
          <div className="modal-badges">
            {priorityLabel && (
              <span
                className="modal-badge priority"
                style={{ backgroundColor: priorityColor }}
              >
                {priorityLabel}
              </span>
            )}
            {issue.state_name && (
              <span className="modal-badge state">{issue.state_name}</span>
            )}
            {issue.estimate && (
              <span className="modal-badge estimate">⏱️ {issue.estimate} pts</span>
            )}
          </div>

          {/* Description */}
          {issue.description && (
            <div className="modal-section">
              <h3 className="modal-section-title">Description</h3>
              <p className="modal-description">{issue.description}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="modal-section">
            <h3 className="modal-section-title">Details</h3>
            <div className="modal-details-grid">
              {issue.project_name && (
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Project</span>
                  <span className="modal-detail-value">📁 {issue.project_name}</span>
                </div>
              )}
              {issue.team_name && (
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Team</span>
                  <span className="modal-detail-value">👥 {issue.team_name}</span>
                </div>
              )}
              <div className="modal-detail-item">
                <span className="modal-detail-label">Created</span>
                <span className="modal-detail-value">
                  {formatShortDate(issue.created_at)}
                </span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Updated</span>
                <span className="modal-detail-value">
                  {formatShortDate(issue.updated_at)}
                </span>
              </div>
              {issue.started_at && (
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Started</span>
                  <span className="modal-detail-value">
                    {formatShortDate(issue.started_at)}
                  </span>
                </div>
              )}
              {issue.completed_at && (
                <div className="modal-detail-item">
                  <span className="modal-detail-label">Completed</span>
                  <span className="modal-detail-value">
                    {formatShortDate(issue.completed_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <a
            href={linearUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="modal-action-btn primary"
          >
            Open in Linear →
          </a>
          <button className="modal-action-btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
