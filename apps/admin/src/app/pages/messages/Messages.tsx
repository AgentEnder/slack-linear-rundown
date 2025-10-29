import { useState, useEffect } from 'react';
import type { Message, Stats } from '@slack-linear-rundown/shared-types';
import {
  AlertMessage,
  LoadingState,
  EmptyState,
  StatsPanel,
} from '@slack-linear-rundown/ui-components';
import { MessageFilters } from './components/MessageFilters';
import { MessageTable } from './components/MessageTable';
import { MessageViewModal } from './components/MessageViewModal';
import styles from './Messages.module.css';

export default function Messages() {
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

  return (
    <div className={styles.container}>
      <h2>Message Delivery History</h2>
      <p className={styles.description}>
        View the history of weekly report deliveries to all users.
      </p>

      {message && <AlertMessage {...message} />}

      {stats && (
        <StatsPanel
          stats={[
            { label: 'Total Deliveries', value: stats.total },
            { label: 'Successful', value: stats.successful, variant: 'success' },
            { label: 'Failed', value: stats.failed, variant: 'error' },
            {
              label: 'Success Rate',
              value: `${
                stats.total > 0
                  ? ((stats.successful / stats.total) * 100).toFixed(1)
                  : 0
              }%`,
            },
          ]}
        />
      )}

      <MessageFilters
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {loading ? (
        <LoadingState message="Loading messages..." />
      ) : messages.length === 0 ? (
        <EmptyState message="No messages found." />
      ) : (
        <MessageTable
          messages={messages}
          onViewMessage={(msg) => {
            setSelectedMessage(msg);
            setShowRawText(false);
          }}
        />
      )}

      <MessageViewModal
        message={selectedMessage}
        showRawText={showRawText}
        onClose={() => setSelectedMessage(null)}
        onToggleRawText={() => setShowRawText(!showRawText)}
      />
    </div>
  );
}
