import styles from './MessageFilters.module.css';

interface MessageFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export function MessageFilters({
  statusFilter,
  onStatusFilterChange,
}: MessageFiltersProps) {
  return (
    <div className={styles.filters}>
      <label htmlFor="status-filter">Filter by Status:</label>
      <select
        id="status-filter"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className={styles.select}
      >
        <option value="all">All Messages</option>
        <option value="success">Successful Only</option>
        <option value="failed">Failed Only</option>
      </select>
    </div>
  );
}
