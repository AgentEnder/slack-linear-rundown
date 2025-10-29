import type {
  User,
  SortField,
  SortDirection,
  MappingStatus,
} from '@slack-linear-rundown/shared-types';
import { Table } from '@slack-linear-rundown/ui-components';
import { UserTableRow } from './UserTableRow';
import styles from '../Users.module.css';

interface UserTableProps {
  users: User[];
  selectedUserIds: Set<number>;
  sortField: SortField;
  sortDirection: SortDirection;
  getMappingStatus: (user: User) => MappingStatus;
  onSort: (field: SortField) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleUser: (userId: number) => void;
  onToggleReports: (userId: number, currentValue: boolean) => void;
  onSendSuccess: (message: string) => void;
  onSendError: (error: string) => void;
}

export function UserTable({
  users,
  selectedUserIds,
  sortField,
  sortDirection,
  getMappingStatus,
  onSort,
  onSelectAll,
  onDeselectAll,
  onToggleUser,
  onToggleReports,
  onSendSuccess,
  onSendError,
}: UserTableProps) {
  const allSelected = users.length > 0 && users.every((u) => selectedUserIds.has(u.id));

  return (
    <Table>
      <thead>
        <tr>
          <th className={styles.checkboxCell}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => {
                if (e.target.checked) {
                  onSelectAll();
                } else {
                  onDeselectAll();
                }
              }}
              aria-label="Select all filtered users"
            />
          </th>
          <th onClick={() => onSort('name')} className={styles.sortable}>
            User {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
          </th>
          <th onClick={() => onSort('email')} className={styles.sortable}>
            Email {sortField === 'email' && (sortDirection === 'asc' ? '▲' : '▼')}
          </th>
          <th onClick={() => onSort('mapping')} className={styles.sortable}>
            Mapping Status{' '}
            {sortField === 'mapping' && (sortDirection === 'asc' ? '▲' : '▼')}
          </th>
          <th onClick={() => onSort('active')} className={styles.sortable}>
            Active{' '}
            {sortField === 'active' && (sortDirection === 'asc' ? '▲' : '▼')}
          </th>
          <th>Receive Reports (Primary Sort)</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <UserTableRow
            key={user.id}
            user={user}
            isSelected={selectedUserIds.has(user.id)}
            mappingStatus={getMappingStatus(user)}
            onToggleSelection={() => onToggleUser(user.id)}
            onToggleReports={() => onToggleReports(user.id, user.receive_reports)}
            onSendSuccess={onSendSuccess}
            onSendError={onSendError}
          />
        ))}
      </tbody>
    </Table>
  );
}
