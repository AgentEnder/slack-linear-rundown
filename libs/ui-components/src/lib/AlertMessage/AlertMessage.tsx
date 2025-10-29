import type { AlertMessage as AlertMessageType } from '@slack-linear-rundown/shared-types';
import styles from './AlertMessage.module.css';

export interface AlertMessageProps extends AlertMessageType {
  onClose?: () => void;
}

export function AlertMessage({ type, text, onClose }: AlertMessageProps) {
  return (
    <div className={`${styles.message} ${styles[type]}`} role="alert">
      <span>{text}</span>
      {onClose && (
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close message"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default AlertMessage;
