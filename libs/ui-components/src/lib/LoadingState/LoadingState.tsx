import styles from './LoadingState.module.css';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className={styles.loading} role="status">
      <div className={styles.spinner}></div>
      <span>{message}</span>
    </div>
  );
}

export default LoadingState;
