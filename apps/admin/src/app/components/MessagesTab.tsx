import { useState, useEffect } from 'react';
import styles from './MessagesTab.module.css';

interface Message {
  id: number;
  user_id: number;
  status: 'success' | 'failed';
  error_message: string | null;
  message_content: string | null;
  sent_at: string;
  user_email?: string;
  user_name?: string;
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
}

export default function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    loadMessages();
    loadStats();
  }, [statusFilter]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/deliveries?${params}`);
      const result = await response.json();

      if (response.ok) {
        setMessages(result.deliveries || []);
      } else {
        setMessage({
          type: 'error',
          text: result.message || 'Failed to load messages',
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

  const loadStats = async () => {
    try {
      // Fetch all deliveries and compute stats client-side since there's no stats endpoint
      const response = await fetch('/api/admin/deliveries');
      const result = await response.json();

      if (response.ok) {
        const deliveries = result.deliveries || [];
        const total = deliveries.length;
        const successful = deliveries.filter(
          (d: Message) => d.status === 'success'
        ).length;
        const failed = deliveries.filter(
          (d: Message) => d.status === 'failed'
        ).length;

        setStats({
          total,
          successful,
          failed,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getUserDisplay = (msg: Message) => {
    return msg.user_name || msg.user_email || `User #${msg.user_id}`;
  };

  /**
   * Parse Slack mrkdwn format and convert links to HTML
   * Slack format: <url|text> or <url>
   */
  const parseSlackMrkdwn = (text: string): string => {
    // Match <url|text> format
    let parsed = text.replace(
      /<(https?:\/\/[^|>]+)\|([^>]+)>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>'
    );

    // Match <url> format (without display text)
    parsed = parsed.replace(
      /<(https?:\/\/[^>]+)>/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    return parsed;
  };

  /**
   * Render message with parsed Slack mrkdwn
   */
  const renderMessageLine = (line: string, index: number) => {
    const parsedLine = parseSlackMrkdwn(line);
    return (
      <div
        key={index}
        dangerouslySetInnerHTML={{ __html: parsedLine || '&nbsp;' }}
      />
    );
  };

  return (
    <div className={styles.container}>
      <h2>Message Delivery History</h2>
      <p className={styles.description}>
        View the history of weekly report deliveries to all users.
      </p>

      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {stats && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Deliveries:</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Successful:</span>
            <span className={`${styles.statValue} ${styles.success}`}>
              {stats.successful}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Failed:</span>
            <span className={`${styles.statValue} ${styles.error}`}>
              {stats.failed}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Success Rate:</span>
            <span className={styles.statValue}>
              {stats.total > 0
                ? ((stats.successful / stats.total) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        <label htmlFor="status-filter">Filter by Status:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="all">All Messages</option>
          <option value="success">Successful Only</option>
          <option value="failed">Failed Only</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className={styles.empty}>No messages found.</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sent At</th>
                <th>User</th>
                <th>Status</th>
                <th>Error Message</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.id}>
                  <td className={styles.timestamp}>
                    {formatDate(msg.sent_at)}
                  </td>
                  <td>{getUserDisplay(msg)}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        msg.status === 'success' ? styles.success : styles.error
                      }`}
                    >
                      {msg.status === 'success' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td>
                    {msg.error_message ? (
                      <code className={styles.errorCode}>
                        {msg.error_message}
                      </code>
                    ) : (
                      <span className={styles.noError}>—</span>
                    )}
                  </td>
                  <td>
                    {msg.message_content && (
                      <button
                        className={styles.viewButton}
                        onClick={() => {
                          setSelectedMessage(msg);
                          setShowRawText(false);
                        }}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Viewer Modal */}
      {selectedMessage && (
        <div className={styles.modal} onClick={() => setSelectedMessage(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Message to {getUserDisplay(selectedMessage)}</h3>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedMessage(null)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {showRawText ? (
                <pre className={styles.rawText}>
                  {selectedMessage.message_content}
                </pre>
              ) : (
                <div className={styles.renderedMessage}>
                  {selectedMessage.message_content?.split('\n').map(renderMessageLine)}
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.toggleButton}
                onClick={() => setShowRawText(!showRawText)}
              >
                {showRawText ? 'View Rendered' : 'View Raw Text'}
              </button>
              <button
                className={styles.closeButtonSecondary}
                onClick={() => setSelectedMessage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
