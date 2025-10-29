import { useState, useEffect } from 'react';
import type {
  User,
  SortField,
  SortDirection,
  MappingStatus,
} from '@slack-linear-rundown/shared-types';
import {
  AlertMessage,
  LoadingState,
  EmptyState,
  StatsPanel,
} from '@slack-linear-rundown/ui-components';
import styles from './Users.module.css';
import { UserFilters } from './components/UserFilters';
import { UserBulkActions } from './components/UserBulkActions';
import { UserTable } from './components/UserTable';
import { getUserDisplayName } from '@slack-linear-rundown/utils';

export default function Users() {
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
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(
    new Set()
  );
  const [showAllUsersMessage, setShowAllUsersMessage] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      text: `Updated ${successCount} users. ${
        errorCount > 0 ? `${errorCount} failed.` : ''
      }`,
    });

    setSelectedUserIds(new Set());
    setShowAllUsersMessage(false);
    loadUsers();
  };

  const getMappingStatus = (user: User): MappingStatus => {
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
      if (mappingFilter === 'fully-mapped' && !(hasSlack && hasLinear))
        return false;
      if (mappingFilter === 'slack-only' && !(hasSlack && !hasLinear))
        return false;
      if (mappingFilter === 'linear-only' && !(!hasSlack && hasLinear))
        return false;
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
        comparison = getUserDisplayName(a).localeCompare(getUserDisplayName(b));
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
        comparison = a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
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

      {message && <AlertMessage {...message} />}

      <UserBulkActions
        selectedCount={selectedUserIds.size}
        showAllUsersMessage={showAllUsersMessage}
        totalUsersCount={users.length}
        onDeselectAll={handleDeselectAll}
        onSelectAllIncludingFiltered={handleSelectAllIncludingFiltered}
        onBulkEnable={() => handleBulkAction(true)}
        onBulkDisable={() => handleBulkAction(false)}
      />

      <UserFilters
        domainFilter={domainFilter}
        mappingFilter={mappingFilter}
        activeFilter={activeFilter}
        reportsFilter={reportsFilter}
        uniqueDomains={uniqueDomains}
        isDomainDropdownOpen={isDomainDropdownOpen}
        onDomainFilterChange={setDomainFilter}
        onMappingFilterChange={setMappingFilter}
        onActiveFilterChange={setActiveFilter}
        onReportsFilterChange={setReportsFilter}
        onDomainDropdownToggle={() =>
          setIsDomainDropdownOpen(!isDomainDropdownOpen)
        }
        onDomainDropdownClose={() => setIsDomainDropdownOpen(false)}
      />

      {loading ? (
        <LoadingState message="Loading users..." />
      ) : users.length === 0 ? (
        <EmptyState message="No users found. Run user sync job to populate." />
      ) : (
        <UserTable
          users={sortedUsers}
          selectedUserIds={selectedUserIds}
          sortField={sortField}
          sortDirection={sortDirection}
          getMappingStatus={getMappingStatus}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onToggleUser={handleToggleUser}
          onToggleReports={toggleReports}
          onSendSuccess={(text) => setMessage({ type: 'success', text })}
          onSendError={(text) => setMessage({ type: 'error', text })}
        />
      )}

      <StatsPanel
        stats={[
          { label: 'Total Users', value: users.length },
          { label: 'Filtered', value: sortedUsers.length },
          {
            label: 'Active Users',
            value: users.filter((u) => u.is_active).length,
          },
          {
            label: 'Receiving Reports',
            value: users.filter((u) => u.receive_reports).length,
          },
        ]}
      />
    </div>
  );
}
