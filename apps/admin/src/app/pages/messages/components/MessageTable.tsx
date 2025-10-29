import type { Message } from '@slack-linear-rundown/shared-types';
import { Badge, Table } from '@slack-linear-rundown/ui-components';
import { formatDate, getMessageUserDisplay } from '@slack-linear-rundown/utils';
import styles from './MessageTable.module.css';

interface MessageTableProps {
  messages: Message[];
  onViewMessage: (message: Message) => void;
}

export function MessageTable({ messages, onViewMessage }: MessageTableProps) {
  return (
    <Table>
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
            <td className={styles.timestamp}>{formatDate(msg.sent_at)}</td>
            <td>{getMessageUserDisplay(msg)}</td>
            <td>
              <Badge variant={msg.status === 'success' ? 'success' : 'error'}>
                {msg.status === 'success' ? 'Success' : 'Failed'}
              </Badge>
            </td>
            <td>
              {msg.error_message ? (
                <code className={styles.errorCode}>{msg.error_message}</code>
              ) : (
                <span className={styles.noError}>—</span>
              )}
            </td>
            <td>
              {msg.message_content && (
                <button
                  className={styles.viewButton}
                  onClick={() => onViewMessage(msg)}
                >
                  View
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
