import styles from '../Users.module.css';

interface UserBulkActionsProps {
  selectedCount: number;
  showAllUsersMessage: boolean;
  totalUsersCount: number;
  onDeselectAll: () => void;
  onSelectAllIncludingFiltered: () => void;
  onBulkEnable: () => void;
  onBulkDisable: () => void;
}

export function UserBulkActions({
  selectedCount,
  showAllUsersMessage,
  totalUsersCount,
  onDeselectAll,
  onSelectAllIncludingFiltered,
  onBulkEnable,
  onBulkDisable,
}: UserBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <>
      <div className={styles.bulkActions}>
        <div className={styles.bulkInfo}>
          <span className={styles.bulkCount}>
            {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <button
            className={styles.bulkLink}
            onClick={onDeselectAll}
            type="button"
          >
            Deselect all
          </button>
        </div>
        <div className={styles.bulkButtons}>
          <button
            className={`${styles.bulkButton} ${styles.bulkEnable}`}
            onClick={onBulkEnable}
            type="button"
          >
            Enable Reports
          </button>
          <button
            className={`${styles.bulkButton} ${styles.bulkDisable}`}
            onClick={onBulkDisable}
            type="button"
          >
            Disable Reports
          </button>
        </div>
      </div>

      {showAllUsersMessage && (
        <div className={styles.selectAllMessage}>
          <span>{selectedCount} filtered users selected. </span>
          <button
            className={styles.selectAllLink}
            onClick={onSelectAllIncludingFiltered}
            type="button"
          >
            Select all {totalUsersCount} users including those filtered out
          </button>
        </div>
      )}
    </>
  );
}
