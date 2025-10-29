import { Badge } from '@slack-linear-rundown/ui-components';
import type { Job } from '@slack-linear-rundown/shared-types';
import { formatDate } from '@slack-linear-rundown/utils';
import styles from '../Jobs.module.css';

interface JobCardProps {
  job: Job;
  isRunning: boolean;
  onRunJob: () => void;
}

export function JobCard({ job, isRunning, onRunJob }: JobCardProps) {
  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatJobDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return formatDate(dateString);
  };

  const renderStatusBadge = (status: Job['lastStatus'], running: boolean) => {
    if (running) {
      return <Badge variant="info">Running...</Badge>;
    }

    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>;
      case 'failure':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="disabled">Not Run</Badge>;
    }
  };

  return (
    <div className={styles.jobCard}>
      <div className={styles.jobHeader}>
        <div>
          <h3>{job.name}</h3>
          <p className={styles.jobDescription}>{job.description}</p>
        </div>
        {renderStatusBadge(job.lastStatus, job.isRunning)}
      </div>

      <div className={styles.jobDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Schedule:</span>
          <span className={styles.detailValue}>
            {job.scheduleDescription}
            <code className={styles.cronExpression}>{job.schedule}</code>
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Last Run:</span>
          <span className={styles.detailValue}>
            {formatJobDate(job.lastRun)}
          </span>
        </div>

        {job.lastDurationMs !== null && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Duration:</span>
            <span className={styles.detailValue}>
              {formatDuration(job.lastDurationMs)}
            </span>
          </div>
        )}

        {job.lastError && (
          <div className={styles.errorRow}>
            <span className={styles.detailLabel}>Error:</span>
            <span className={styles.errorValue}>{job.lastError}</span>
          </div>
        )}
      </div>

      <div className={styles.jobActions}>
        <button
          onClick={onRunJob}
          className={styles.runBtn}
          disabled={job.isRunning || isRunning}
        >
          {job.isRunning || isRunning ? 'Running...' : 'Run Now'}
        </button>
      </div>
    </div>
  );
}
