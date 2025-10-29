import { useState, useEffect, useRef } from 'react';
import type { User } from '@slack-linear-rundown/shared-types';
import { getUserDisplayName } from '@slack-linear-rundown/utils';
import ReportPreviewModal from '../../../components/ReportPreviewModal';
import styles from '../Jobs.module.css';

interface ManualJobSectionProps {
  onSendSuccess: (message: string) => void;
  onSendError: (error: string) => void;
}

export function ManualJobSection({
  onSendSuccess,
  onSendError,
}: ManualJobSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  const filteredUsers = users.filter((user) => {
    const displayName = getUserDisplayName(user).toLowerCase();
    const email = user.email.toLowerCase();
    const query = userSearchQuery.toLowerCase();
    return displayName.includes(query) || email.includes(query);
  });

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId)
    : null;

  return (
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
                    ? `${getUserDisplayName(selectedUser)} (${selectedUser.email})`
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
                          {getUserDisplayName(user)}
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
              userName={getUserDisplayName(selectedUser)}
              onSendSuccess={(result) => {
                onSendSuccess(
                  `Report sent to ${getUserDisplayName(selectedUser)}${
                    result.inCooldown ? ' (in cooldown)' : ''
                  }. Issues: ${result.issuesCount}`
                );
                // Clear selection after successful send
                setSelectedUserId(null);
                setUserSearchQuery('');
              }}
              onSendError={onSendError}
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
  );
}
