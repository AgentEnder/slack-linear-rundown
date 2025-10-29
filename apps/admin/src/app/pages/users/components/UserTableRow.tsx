import type { User, MappingStatus } from '@slack-linear-rundown/shared-types';
import { Badge } from '@slack-linear-rundown/ui-components';
import { getUserDisplayName } from '@slack-linear-rundown/utils';
import { SendIcon } from '@slack-linear-rundown/icons';
import ReportPreviewModal from '../../../components/ReportPreviewModal';
import styles from '../Users.module.css';

interface UserTableRowProps {
  user: User;
  isSelected: boolean;
  mappingStatus: MappingStatus;
  onToggleSelection: () => void;
  onToggleReports: () => void;
  onSendSuccess: (message: string) => void;
  onSendError: (error: string) => void;
}

export function UserTableRow({
  user,
  isSelected,
  mappingStatus,
  onToggleSelection,
  onToggleReports,
  onSendSuccess,
  onSendError,
}: UserTableRowProps) {
  return (
    <tr className={isSelected ? styles.selectedRow : ''}>
      <td className={styles.checkboxCell}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          aria-label={`Select ${getUserDisplayName(user)}`}
        />
      </td>
      <td className={styles.userName}>{getUserDisplayName(user)}</td>
      <td>
        <code className={styles.email}>{user.email}</code>
      </td>
      <td>
        <Badge variant={mappingStatus.status}>{mappingStatus.text}</Badge>
      </td>
      <td>
        <Badge variant={user.is_active ? 'success' : 'inactive'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td>
        <Badge variant={user.receive_reports ? 'success' : 'disabled'}>
          {user.receive_reports ? 'Enabled' : 'Disabled'}
        </Badge>
      </td>
      <td>
        <div className={styles.actionsCell}>
          <button
            onClick={onToggleReports}
            className={`${styles.toggleBtn} ${
              user.receive_reports ? styles.disable : styles.enable
            }`}
            disabled={!user.is_active}
          >
            {user.receive_reports ? 'Disable' : 'Enable'}
          </button>
          <ReportPreviewModal
            userId={user.id}
            userName={getUserDisplayName(user)}
            onSendSuccess={(result) => {
              onSendSuccess(
                `Report sent to ${getUserDisplayName(user)}${
                  result.inCooldown ? ' (in cooldown)' : ''
                }. Issues: ${result.issuesCount}`
              );
            }}
            onSendError={onSendError}
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
                aria-label={`Send report to ${getUserDisplayName(user)}`}
                title={
                  !user.slack_user_id || !user.linear_user_id
                    ? 'User must be fully mapped to receive reports'
                    : 'Preview and send report to user'
                }
              >
                <SendIcon />
              </button>
            )}
          </ReportPreviewModal>
        </div>
      </td>
    </tr>
  );
}
