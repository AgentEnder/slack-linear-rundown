import { useState, useEffect, useRef } from 'react';
import styles from './JobsTab.module.css';
import ReportPreviewModal from './ReportPreviewModal';

interface Job {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleDescription: string;
  lastRun: string | null;
  lastStatus: 'success' | 'failure' | 'running' | null;
  lastError: string | null;
  lastDurationMs: number | null;
  isRunning: boolean;
}

interface User {
  id: number;
  email: string;
  slack_user_id: string | null;
  slack_real_name: string | null;
  linear_user_id: string | null;
  linear_name: string | null;
  is_active: boolean;
  receive_reports: boolean;
}

export default function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobs, setRunningJobs] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Manual report sending state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchJobs();
    fetchUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    };

    if (isUserDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen]);

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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (response.ok && result.users) {
        // Only show active users with full mapping
        const eligibleUsers = result.users.filter(
          (u: User) => u.is_active && u.slack_user_id && u.linear_user_id
        );
        setUsers(eligibleUsers);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };


  const getDisplayName = (user: User): string => {
    return user.slack_real_name || user.linear_name || user.email;
  };

  const filteredUsers = users.filter((user) => {
    const displayName = getDisplayName(user).toLowerCase();
    const email = user.email.toLowerCase();
    const query = userSearchQuery.toLowerCase();
    return displayName.includes(query) || email.includes(query);
  });

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  const renderStatusBadge = (status: Job['lastStatus'], isRunning: boolean) => {
    if (isRunning) {
      return <span className={styles.statusRunning}>Running...</span>;
    }

    switch (status) {
      case 'success':
        return <span className={styles.statusSuccess}>Success</span>;
      case 'failure':
        return <span className={styles.statusFailure}>Failed</span>;
      default:
        return <span className={styles.statusNone}>Not Run</span>;
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

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading jobs...</div>
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.jobCard}>
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
                    <code className={styles.cronExpression}>
                      {job.schedule}
                    </code>
                  </span>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Last Run:</span>
                  <span className={styles.detailValue}>
                    {formatDate(job.lastRun)}
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
                  onClick={() => runJob(job.id)}
                  className={styles.runBtn}
                  disabled={job.isRunning || runningJobs.has(job.id)}
                >
                  {job.isRunning || runningJobs.has(job.id)
                    ? 'Running...'
                    : 'Run Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Jobs Section */}
      <div className={styles.manualJobsSection}>
        <h2>Manual Jobs</h2>
        <p className={styles.description}>
          Trigger one-time operations and ad-hoc tasks
        </p>

        <div className={styles.jobCard}>
          <div className={styles.jobHeader}>
            <div>
              <h3>Send Individual Report</h3>
              <p className={styles.jobDescription}>
                Send an ad-hoc report to a specific user for testing and validation
              </p>
            </div>
          </div>

          <div className={styles.manualJobContent}>
            <div className={styles.userSelectGroup}>
              <label className={styles.userSelectLabel}>Select User:</label>
              <div className={styles.autocomplete} ref={userDropdownRef}>
                <input
                  type="text"
                  className={styles.autocompleteInput}
                  placeholder={
                    loadingUsers
                      ? 'Loading users...'
                      : 'Search by name or email...'
                  }
                  value={
                    selectedUser
                      ? `${getDisplayName(selectedUser)} (${selectedUser.email})`
                      : userSearchQuery
                  }
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setSelectedUserId(null);
                    setIsUserDropdownOpen(true);
                  }}
                  onFocus={() => setIsUserDropdownOpen(true)}
                  disabled={loadingUsers}
                />
                {isUserDropdownOpen && !loadingUsers && (
                  <div className={styles.autocompleteDropdown}>
                    {filteredUsers.length === 0 ? (
                      <div className={styles.autocompleteEmpty}>
                        No eligible users found
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={styles.autocompleteOption}
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setUserSearchQuery('');
                            setIsUserDropdownOpen(false);
                          }}
                        >
                          <div className={styles.userOptionName}>
                            {getDisplayName(user)}
                          </div>
                          <div className={styles.userOptionEmail}>
                            {user.email}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {selectedUserId && selectedUser && (
              <ReportPreviewModal
                userId={selectedUserId}
                userName={getDisplayName(selectedUser)}
                onSendSuccess={(result) => {
                  setMessage({
                    type: 'success',
                    text: `Report sent to ${getDisplayName(selectedUser)}${
                      result.inCooldown ? ' (in cooldown)' : ''
                    }. Issues: ${result.issuesCount}`,
                  });
                  // Clear selection after successful send
                  setSelectedUserId(null);
                  setUserSearchQuery('');
                }}
                onSendError={(error) => {
                  setMessage({
                    type: 'error',
                    text: error,
                  });
                }}
              >
                {({ onClick, disabled }) => (
                  <button
                    onClick={onClick}
                    className={styles.sendReportBtn}
                    disabled={disabled}
                  >
                    Send Report
                  </button>
                )}
              </ReportPreviewModal>
            )}
            {!selectedUserId && (
              <button className={styles.sendReportBtn} disabled>
                Send Report
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
