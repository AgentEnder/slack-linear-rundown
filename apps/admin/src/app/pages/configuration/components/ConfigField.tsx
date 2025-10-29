import { Badge } from '@slack-linear-rundown/ui-components';
import type { ConfigStatus } from '@slack-linear-rundown/shared-types';
import styles from './ConfigField.module.css';

interface ConfigFieldProps {
  id: string;
  label: string;
  value: string;
  type?: 'text' | 'password';
  placeholder: string;
  status: ConfigStatus;
  showApiStatus?: boolean;
  onChange: (value: string) => void;
}

export function ConfigField({
  id,
  label,
  value,
  type = 'password',
  placeholder,
  status,
  showApiStatus = false,
  onChange,
}: ConfigFieldProps) {
  const renderStatus = () => {
    if (status.decryptionError) {
      return (
        <div className={styles.fieldStatus}>
          <Badge variant="error">⚠ Decryption Error</Badge>
          <span className={styles.statusSource}>
            Source: Database (corrupted)
          </span>
        </div>
      );
    }

    if (!status.configured) {
      return (
        <div className={styles.fieldStatus}>
          <Badge variant="disabled">Not Set</Badge>
        </div>
      );
    }

    const sourceLabel =
      status.source === 'database'
        ? 'Database (encrypted)'
        : status.source === 'environment'
        ? 'Environment Variable'
        : 'Unknown';

    if (showApiStatus) {
      if (status.apiWorking === true) {
        return (
          <div className={styles.fieldStatus}>
            <Badge variant="success">✓ Connected</Badge>
            <span className={styles.statusSource}>{sourceLabel}</span>
            {status.apiDetails && (
              <span className={styles.statusDetails}>
                {status.apiDetails.team || status.apiDetails.name}
              </span>
            )}
          </div>
        );
      } else if (status.apiWorking === false) {
        return (
          <div className={styles.fieldStatus}>
            <Badge variant="error">✗ API Error</Badge>
            <span className={styles.statusSource}>{sourceLabel}</span>
          </div>
        );
      }
    }

    return (
      <div className={styles.fieldStatus}>
        <Badge variant="info">Configured</Badge>
        <span className={styles.statusSource}>{sourceLabel}</span>
      </div>
    );
  };

  return (
    <div className={styles.configField}>
      <div className={styles.fieldHeader}>
        <label htmlFor={id}>{label}</label>
        {renderStatus()}
      </div>
      <input
        type={type}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
        placeholder={placeholder}
      />
    </div>
  );
}
