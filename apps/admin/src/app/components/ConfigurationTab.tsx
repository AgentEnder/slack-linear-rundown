import { useState, useEffect } from 'react';
import styles from './ConfigurationTab.module.css';

type ConfigKey =
  | 'SLACK_BOT_TOKEN'
  | 'LINEAR_API_KEY'
  | 'SLACK_SIGNING_SECRET'
  | 'REPORT_SCHEDULE';

interface ConfigFormData {
  SLACK_BOT_TOKEN: string;
  LINEAR_API_KEY: string;
  SLACK_SIGNING_SECRET: string;
  REPORT_SCHEDULE: string;
}

interface ConfigStatus {
  configured: boolean;
  source: 'database' | 'environment' | 'none';
  decryptionError: boolean;
  apiWorking: boolean | null;
  apiDetails: Record<string, unknown> | null;
  apiError: string | null;
}

interface StatusResponse {
  SLACK_BOT_TOKEN: ConfigStatus;
  LINEAR_API_KEY: ConfigStatus;
  SLACK_SIGNING_SECRET: ConfigStatus;
  REPORT_SCHEDULE: ConfigStatus;
}

export default function ConfigurationTab() {
  const [formData, setFormData] = useState<ConfigFormData>({
    SLACK_BOT_TOKEN: '',
    LINEAR_API_KEY: '',
    SLACK_SIGNING_SECRET: '',
    REPORT_SCHEDULE: '',
  });
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/admin/status');
      const result = await response.json();

      if (response.ok && result.status) {
        setStatus(result.status);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Only send fields that have values
      const body: Partial<ConfigFormData> = {};
      (Object.keys(formData) as ConfigKey[]).forEach((key) => {
        if (formData[key]) {
          body[key] = formData[key];
        }
      });

      if (Object.keys(body).length === 0) {
        setMessage({
          type: 'error',
          text: 'Please enter at least one configuration value',
        });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `${result.updatedKeys?.length || 0} configuration value(s) updated successfully`,
        });
        // Clear form
        setFormData({
          SLACK_BOT_TOKEN: '',
          LINEAR_API_KEY: '',
          SLACK_SIGNING_SECRET: '',
          REPORT_SCHEDULE: '',
        });
        // Refresh status after updating config
        fetchStatus();
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to save configuration',
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

  const renderFieldStatus = (key: ConfigKey, config: ConfigStatus) => {
    if (config.decryptionError) {
      return (
        <div className={styles.fieldStatus}>
          <span className={styles.statusBadgeError} title="Decryption failed">
            ⚠ Decryption Error
          </span>
          <span className={styles.statusSource}>Source: Database (corrupted)</span>
        </div>
      );
    }

    if (!config.configured) {
      return (
        <div className={styles.fieldStatus}>
          <span className={styles.statusBadgeNone}>Not Set</span>
        </div>
      );
    }

    const sourceLabel =
      config.source === 'database'
        ? 'Database (encrypted)'
        : config.source === 'environment'
          ? 'Environment Variable'
          : 'Unknown';

    // For API keys (Slack/Linear), show API status
    if (key === 'SLACK_BOT_TOKEN' || key === 'LINEAR_API_KEY') {
      if (config.apiWorking === true) {
        return (
          <div className={styles.fieldStatus}>
            <span className={styles.statusBadgeWorking}>✓ Connected</span>
            <span className={styles.statusSource}>{sourceLabel}</span>
            {config.apiDetails && (
              <span className={styles.statusDetails}>
                {key === 'SLACK_BOT_TOKEN'
                  ? `Team: ${config.apiDetails.team as string}`
                  : `User: ${config.apiDetails.name as string}`}
              </span>
            )}
          </div>
        );
      } else if (config.apiWorking === false) {
        return (
          <div className={styles.fieldStatus}>
            <span
              className={styles.statusBadgeError}
              title={config.apiError || undefined}
            >
              ✗ API Error
            </span>
            <span className={styles.statusSource}>{sourceLabel}</span>
          </div>
        );
      } else {
        return (
          <div className={styles.fieldStatus}>
            <span className={styles.statusBadgeConfigured}>Configured</span>
            <span className={styles.statusSource}>{sourceLabel}</span>
          </div>
        );
      }
    }

    // For non-API keys, just show configured status
    return (
      <div className={styles.fieldStatus}>
        <span className={styles.statusBadgeConfigured}>Configured</span>
        <span className={styles.statusSource}>{sourceLabel}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <h2>Configuration</h2>
      <p className={styles.description}>
        Configure API credentials and settings. Values stored in the database
        are encrypted at rest using AES-256-GCM. Environment variables can be
        used as fallback.
      </p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {statusLoading ? (
        <div className={styles.loadingState}>Loading configuration status...</div>
      ) : status ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.configField}>
            <div className={styles.fieldHeader}>
              <label htmlFor="SLACK_BOT_TOKEN">Slack Bot Token</label>
              {renderFieldStatus('SLACK_BOT_TOKEN', status.SLACK_BOT_TOKEN)}
            </div>
            <input
              type="password"
              id="SLACK_BOT_TOKEN"
              value={formData.SLACK_BOT_TOKEN}
              onChange={(e) =>
                setFormData({ ...formData, SLACK_BOT_TOKEN: e.target.value })
              }
              className={styles.input}
              placeholder="xoxb-..."
            />
          </div>

          <div className={styles.configField}>
            <div className={styles.fieldHeader}>
              <label htmlFor="LINEAR_API_KEY">Linear API Key</label>
              {renderFieldStatus('LINEAR_API_KEY', status.LINEAR_API_KEY)}
            </div>
            <input
              type="password"
              id="LINEAR_API_KEY"
              value={formData.LINEAR_API_KEY}
              onChange={(e) =>
                setFormData({ ...formData, LINEAR_API_KEY: e.target.value })
              }
              className={styles.input}
              placeholder="lin_api_..."
            />
          </div>

          <div className={styles.configField}>
            <div className={styles.fieldHeader}>
              <label htmlFor="SLACK_SIGNING_SECRET">Slack Signing Secret</label>
              {renderFieldStatus(
                'SLACK_SIGNING_SECRET',
                status.SLACK_SIGNING_SECRET
              )}
            </div>
            <input
              type="password"
              id="SLACK_SIGNING_SECRET"
              value={formData.SLACK_SIGNING_SECRET}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  SLACK_SIGNING_SECRET: e.target.value,
                })
              }
              className={styles.input}
              placeholder="Signing secret from Slack app settings"
            />
          </div>

          <div className={styles.configField}>
            <div className={styles.fieldHeader}>
              <label htmlFor="REPORT_SCHEDULE">Report Schedule (Cron)</label>
              {renderFieldStatus('REPORT_SCHEDULE', status.REPORT_SCHEDULE)}
            </div>
            <input
              type="text"
              id="REPORT_SCHEDULE"
              value={formData.REPORT_SCHEDULE}
              onChange={(e) =>
                setFormData({ ...formData, REPORT_SCHEDULE: e.target.value })
              }
              className={styles.input}
              placeholder="0 9 * * 1 (every Monday at 9 AM)"
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Update Configuration'}
            </button>
            <button
              type="button"
              onClick={fetchStatus}
              className={styles.refreshBtn}
              disabled={statusLoading || loading}
            >
              Refresh Status
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.error}>Failed to load configuration status</div>
      )}

      <div className={styles.notesSection}>
        <h3>Notes</h3>
        <ul>
          <li>
            <strong>Database:</strong> Values stored encrypted in the database
            (recommended for production)
          </li>
          <li>
            <strong>Environment:</strong> Unencrypted values from .env file
            (fallback when not in database)
          </li>
          <li>
            Updating a field here will store it encrypted in the database and
            override any environment variable
          </li>
          <li>Leave fields blank to keep their current values unchanged</li>
        </ul>
      </div>
    </div>
  );
}
