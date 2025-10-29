import { useState, useEffect } from 'react';
import {
  AlertMessage,
  LoadingState,
} from '@slack-linear-rundown/ui-components';
import type {
  ConfigKey,
  ConfigFormData,
  StatusResponse,
} from '@slack-linear-rundown/shared-types';
import { ConfigField } from './components/ConfigField';
import styles from './Configuration.module.css';

export default function Configuration() {
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
          text: `${
            result.updatedKeys?.length || 0
          } configuration value(s) updated successfully`,
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

  return (
    <div className={styles.container}>
      <h2>Configuration</h2>
      <p className={styles.description}>
        Configure API credentials and settings. Values stored in the database
        are encrypted at rest using AES-256-GCM. Environment variables can be
        used as fallback.
      </p>

      {message && <AlertMessage {...message} />}

      {statusLoading ? (
        <LoadingState message="Loading configuration status..." />
      ) : status ? (
        <form onSubmit={handleSubmit} className={styles.form}>
          <ConfigField
            id="SLACK_BOT_TOKEN"
            label="Slack Bot Token"
            value={formData.SLACK_BOT_TOKEN}
            type="password"
            placeholder="xoxb-..."
            status={status.SLACK_BOT_TOKEN}
            showApiStatus={true}
            onChange={(value) =>
              setFormData({ ...formData, SLACK_BOT_TOKEN: value })
            }
          />

          <ConfigField
            id="LINEAR_API_KEY"
            label="Linear API Key"
            value={formData.LINEAR_API_KEY}
            type="password"
            placeholder="lin_api_..."
            status={status.LINEAR_API_KEY}
            showApiStatus={true}
            onChange={(value) =>
              setFormData({ ...formData, LINEAR_API_KEY: value })
            }
          />

          <ConfigField
            id="SLACK_SIGNING_SECRET"
            label="Slack Signing Secret"
            value={formData.SLACK_SIGNING_SECRET}
            type="password"
            placeholder="Signing secret from Slack app settings"
            status={status.SLACK_SIGNING_SECRET}
            showApiStatus={false}
            onChange={(value) =>
              setFormData({ ...formData, SLACK_SIGNING_SECRET: value })
            }
          />

          <ConfigField
            id="REPORT_SCHEDULE"
            label="Report Schedule (Cron)"
            value={formData.REPORT_SCHEDULE}
            type="text"
            placeholder="0 9 * * 1 (every Monday at 9 AM)"
            status={status.REPORT_SCHEDULE}
            showApiStatus={false}
            onChange={(value) =>
              setFormData({ ...formData, REPORT_SCHEDULE: value })
            }
          />

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
