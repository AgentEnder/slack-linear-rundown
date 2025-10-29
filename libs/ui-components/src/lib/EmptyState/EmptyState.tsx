import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📭' }: EmptyStateProps) {
  return (
    <div className={styles.empty} role="status">
      <span className={styles.icon}>{icon}</span>
      <p>{message}</p>
    </div>
  );
}

export default EmptyState;
