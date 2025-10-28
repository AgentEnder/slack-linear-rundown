import { useState, useEffect, useRef } from 'react';
import styles from './UsersTab.module.css';
import ReportPreviewModal from './ReportPreviewModal';

interface User {
  id: number;
  email: string;
  slack_user_id: string | null;
  slack_real_name: string | null;
  linear_user_id: string | null;
  linear_name: string | null;
  is_active: boolean;
  receive_reports: boolean;
  created_at: string;
  updated_at: string;
}

type SortField = 'name' | 'email' | 'mapping' | 'active';
type SortDirection = 'asc' | 'desc';

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filtering state
  const [mappingFilter, setMappingFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [reportsFilter, setReportsFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);

  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [showAllUsersMessage, setShowAllUsersMessage] = useState(false);


  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Ref for domain dropdown
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        domainDropdownRef.current &&
        !domainDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDomainDropdownOpen(false);
      }
    };

    if (isDomainDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDomainDropdownOpen]);

  // Set default domain filter when users load
  useEffect(() => {
    if (users.length > 0 && domainFilter.length === 0) {
      // Extract domains and count fully mapped users per domain
      const domainCounts = new Map<string, number>();
      users.forEach((user) => {
        const domain = user.email.split('@')[1];
        if (domain) {
          const hasSlack = !!user.slack_user_id;
          const hasLinear = !!user.linear_user_id;
          const isFullyMapped = hasSlack && hasLinear;

          if (isFullyMapped) {
            domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
          }
        }
      });

      // Find domain with most fully mapped users
      let maxDomain = '';
      let maxCount = 0;
      domainCounts.forEach((count, domain) => {
        if (count > maxCount) {
          maxCount = count;
          maxDomain = domain;
        }
      });

      if (maxDomain) {
        setDomainFilter([maxDomain]);
      }
    }
  }, [users, domainFilter.length]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (response.ok) {
        setUsers(result.users || []);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to load users',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error: ' + (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleReports = async (userId: number, currentValue: boolean) => {
    const newValue = !currentValue;
    try {
      const response = await fetch(
        `/api/admin/users/${userId}/receive-reports`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: newValue }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Reports ${newValue ? 'enabled' : 'disabled'} for user`,
        });
        loadUsers();
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to update user',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error: ' + (error as Error).message,
      });
    }
  };


  const handleSelectAll = () => {
    const filteredIds = new Set(sortedUsers.map((u) => u.id));
    setSelectedUserIds(filteredIds);
    if (sortedUsers.length < users.length) {
      setShowAllUsersMessage(true);
    }
  };

  const handleSelectAllIncludingFiltered = () => {
    const allIds = new Set(users.map((u) => u.id));
    setSelectedUserIds(allIds);
    setShowAllUsersMessage(false);
  };

  const handleDeselectAll = () => {
    setSelectedUserIds(new Set());
    setShowAllUsersMessage(false);
  };

  const handleToggleUser = (userId: number) => {
    const newSelection = new Set(selectedUserIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUserIds(newSelection);
  };

  const handleBulkAction = async (enabled: boolean) => {
    if (selectedUserIds.size === 0) return;

    const userIds = Array.from(selectedUserIds);
    let successCount = 0;
    let errorCount = 0;

    setMessage({
      type: 'success',
      text: `Processing ${userIds.length} users...`,
    });

    for (const userId of userIds) {
      try {
        const response = await fetch(
          `/api/admin/users/${userId}/receive-reports`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    }

    setMessage({
      type: errorCount === 0 ? 'success' : 'error',
      text: `Updated ${successCount} users. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
    });

    setSelectedUserIds(new Set());
    setShowAllUsersMessage(false);
    loadUsers();
  };

  const getDisplayName = (user: User) => {
    return user.slack_real_name || user.linear_name || user.email;
  };

  const getMappingStatus = (user: User) => {
    const hasSlack = !!user.slack_user_id;
    const hasLinear = !!user.linear_user_id;

    if (hasSlack && hasLinear)
      return { text: 'Fully Mapped', status: 'success' };
    if (hasSlack) return { text: 'Slack Only', status: 'warning' };
    if (hasLinear) return { text: 'Linear Only', status: 'warning' };
    return { text: 'Unmapped', status: 'error' };
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get unique email domains from users
  const uniqueDomains = Array.from(
    new Set(users.map((u) => u.email.split('@')[1]).filter(Boolean))
  ).sort();

  const handleDomainToggle = (domain: string) => {
    setDomainFilter((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Domain filter
    if (domainFilter.length > 0) {
      const userDomain = user.email.split('@')[1];
      if (!userDomain || !domainFilter.includes(userDomain)) return false;
    }

    // Mapping filter
    if (mappingFilter !== 'all') {
      const hasSlack = !!user.slack_user_id;
      const hasLinear = !!user.linear_user_id;
      if (mappingFilter === 'fully-mapped' && !(hasSlack && hasLinear)) return false;
      if (mappingFilter === 'slack-only' && !(hasSlack && !hasLinear)) return false;
      if (mappingFilter === 'linear-only' && !(!hasSlack && hasLinear)) return false;
      if (mappingFilter === 'unmapped' && (hasSlack || hasLinear)) return false;
    }

    // Active filter
    if (activeFilter !== 'all') {
      if (activeFilter === 'active' && !user.is_active) return false;
      if (activeFilter === 'inactive' && user.is_active) return false;
    }

    // Reports filter
    if (reportsFilter !== 'all') {
      if (reportsFilter === 'enabled' && !user.receive_reports) return false;
      if (reportsFilter === 'disabled' && user.receive_reports) return false;
    }

    return true;
  });

  // Sort users (always primary sort by receive_reports descending, then secondary sort)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // Primary sort: receive_reports (true first)
    if (a.receive_reports !== b.receive_reports) {
      return b.receive_reports === true ? 1 : -1;
    }

    // Secondary sort based on selected field
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = getDisplayName(a).localeCompare(getDisplayName(b));
        break;
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'mapping': {
        const aStatus = getMappingStatus(a).text;
        const bStatus = getMappingStatus(b).text;
        comparison = aStatus.localeCompare(bStatus);
        break;
      }
      case 'active':
        comparison = (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return (
    <div className={styles.container}>
      <h2>User Management</h2>
      <p className={styles.description}>
        Manage which users receive weekly reports. Users are automatically
        synced from Slack and Linear.
      </p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {selectedUserIds.size > 0 && (
        <div className={styles.bulkActions}>
          <div className={styles.bulkInfo}>
            <span className={styles.bulkCount}>
              {selectedUserIds.size} user{selectedUserIds.size !== 1 ? 's' : ''} selected
            </span>
            <button
              className={styles.bulkLink}
              onClick={handleDeselectAll}
              type="button"
            >
              Deselect all
            </button>
          </div>
          <div className={styles.bulkButtons}>
            <button
              className={`${styles.bulkButton} ${styles.bulkEnable}`}
              onClick={() => handleBulkAction(true)}
              type="button"
            >
              Enable Reports
            </button>
            <button
              className={`${styles.bulkButton} ${styles.bulkDisable}`}
              onClick={() => handleBulkAction(false)}
              type="button"
            >
              Disable Reports
            </button>
          </div>
        </div>
      )}

      {showAllUsersMessage && (
        <div className={styles.selectAllMessage}>
          <span>
            {selectedUserIds.size} filtered users selected.{' '}
          </span>
          <button
            className={styles.selectAllLink}
            onClick={handleSelectAllIncludingFiltered}
            type="button"
          >
            Select all {users.length} users including those filtered out
          </button>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="domain-filter">Email Domains:</label>
          <div className={styles.combobox} ref={domainDropdownRef}>
            <button
              id="domain-filter"
              className={styles.comboboxButton}
              onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
              type="button"
            >
              <span className={styles.comboboxValue}>
                {domainFilter.length === 0
                  ? 'All domains'
                  : domainFilter.length === 1
                  ? domainFilter[0]
                  : `${domainFilter.length} domains selected`}
              </span>
              <span className={styles.comboboxArrow}>▼</span>
            </button>
            {isDomainDropdownOpen && (
              <div className={styles.comboboxDropdown}>
                {uniqueDomains.length === 0 ? (
                  <div className={styles.comboboxEmpty}>No domains available</div>
                ) : (
                  <>
                    <label className={styles.comboboxOption}>
                      <input
                        type="checkbox"
                        checked={domainFilter.length === 0}
                        onChange={() => setDomainFilter([])}
                      />
                      <span>All domains</span>
                    </label>
                    {uniqueDomains.map((domain) => (
                      <label key={domain} className={styles.comboboxOption}>
                        <input
                          type="checkbox"
                          checked={domainFilter.includes(domain)}
                          onChange={() => handleDomainToggle(domain)}
                        />
                        <span>{domain}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="mapping-filter">Mapping:</label>
          <select
            id="mapping-filter"
            value={mappingFilter}
            onChange={(e) => setMappingFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="fully-mapped">Fully Mapped</option>
            <option value="slack-only">Slack Only</option>
            <option value="linear-only">Linear Only</option>
            <option value="unmapped">Unmapped</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="active-filter">Status:</label>
          <select
            id="active-filter"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="reports-filter">Reports:</label>
          <select
            id="reports-filter"
            value={reportsFilter}
            onChange={(e) => setReportsFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading users...</div>
      ) : users.length === 0 ? (
        <div className={styles.empty}>
          No users found. Run user sync job to populate.
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={
                      sortedUsers.length > 0 &&
                      sortedUsers.every((u) => selectedUserIds.has(u.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleSelectAll();
                      } else {
                        handleDeselectAll();
                      }
                    }}
                    aria-label="Select all filtered users"
                  />
                </th>
                <th onClick={() => handleSort('name')} className={styles.sortable}>
                  User {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('email')} className={styles.sortable}>
                  Email {sortField === 'email' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('mapping')} className={styles.sortable}>
                  Mapping Status {sortField === 'mapping' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th onClick={() => handleSort('active')} className={styles.sortable}>
                  Active {sortField === 'active' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th>Receive Reports (Primary Sort)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const mappingStatus = getMappingStatus(user);
                return (
                  <tr key={user.id} className={selectedUserIds.has(user.id) ? styles.selectedRow : ''}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => handleToggleUser(user.id)}
                        aria-label={`Select ${getDisplayName(user)}`}
                      />
                    </td>
                    <td className={styles.userName}>{getDisplayName(user)}</td>
                    <td>
                      <code className={styles.email}>{user.email}</code>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          styles[mappingStatus.status]
                        }`}
                      >
                        {mappingStatus.text}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          user.is_active ? styles.success : styles.inactive
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          user.receive_reports
                            ? styles.success
                            : styles.disabled
                        }`}
                      >
                        {user.receive_reports ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          onClick={() =>
                            toggleReports(user.id, user.receive_reports)
                          }
                          className={`${styles.toggleBtn} ${
                            user.receive_reports ? styles.disable : styles.enable
                          }`}
                          disabled={!user.is_active}
                        >
                          {user.receive_reports ? 'Disable' : 'Enable'}
                        </button>
                        <ReportPreviewModal
                          userId={user.id}
                          userName={getDisplayName(user)}
                          onSendSuccess={(result) => {
                            setMessage({
                              type: 'success',
                              text: `Report sent to ${getDisplayName(user)}${
                                result.inCooldown ? ' (in cooldown)' : ''
                              }. Issues: ${result.issuesCount}`,
                            });
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
                              disabled={
                                !user.is_active ||
                                !user.slack_user_id ||
                                !user.linear_user_id ||
                                disabled
                              }
                              title={
                                !user.slack_user_id || !user.linear_user_id
                                  ? 'User must be fully mapped to receive reports'
                                  : 'Preview and send report to user'
                              }
                            >
                              Send Report
                            </button>
                          )}
                        </ReportPreviewModal>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Users:</span>
          <span className={styles.statValue}>{users.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Filtered:</span>
          <span className={styles.statValue}>{sortedUsers.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Active Users:</span>
          <span className={styles.statValue}>
            {users.filter((u) => u.is_active).length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Receiving Reports:</span>
          <span className={styles.statValue}>
            {users.filter((u) => u.receive_reports).length}
          </span>
        </div>
      </div>
    </div>
  );
}
