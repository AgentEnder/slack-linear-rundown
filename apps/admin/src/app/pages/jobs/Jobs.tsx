import { useState, useEffect } from 'react';
import {
  AlertMessage,
  LoadingState,
} from '@slack-linear-rundown/ui-components';
import type { Job } from '@slack-linear-rundown/shared-types';
import styles from './Jobs.module.css';
import { JobCard } from './components/JobCard';
import { ManualJobSection } from './components/ManualJobSection';

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/jobs');
      const result = await response.json();

      if (response.ok && result.jobs) {
        setJobs(result.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const runJob = async (jobId: string) => {
    setMessage(null);
    setRunningJobs((prev) => new Set(prev).add(jobId));

    try {
      const response = await fetch(`/api/jobs/${jobId}/run`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Job "${jobId}" started successfully. Refresh to see updated status.`,
        });

        // Poll for updates
        const pollInterval = setInterval(async () => {
          await fetchJobs();
          const job = jobs.find((j) => j.id === jobId);
          if (job && !job.isRunning) {
            clearInterval(pollInterval);
            setRunningJobs((prev) => {
              const next = new Set(prev);
              next.delete(jobId);
              return next;
            });
          }
        }, 2000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setRunningJobs((prev) => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        }, 300000);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to start job',
        });
        setRunningJobs((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error: ' + (error as Error).message,
      });
      setRunningJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Scheduled Jobs</h2>
          <p className={styles.description}>
            Manage and trigger automated tasks
          </p>
        </div>
        <button
          onClick={fetchJobs}
          className={styles.refreshBtn}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {message && <AlertMessage {...message} />}

      {loading ? (
        <LoadingState message="Loading jobs..." />
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isRunning={runningJobs.has(job.id)}
              onRunJob={() => runJob(job.id)}
            />
          ))}
        </div>
      )}

      <ManualJobSection
        onSendSuccess={(text) => setMessage({ type: 'success', text })}
        onSendError={(text) => setMessage({ type: 'error', text })}
      />
    </div>
  );
}
