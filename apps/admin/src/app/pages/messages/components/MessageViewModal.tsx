import type { Message } from '@slack-linear-rundown/shared-types';
import { Modal } from '@slack-linear-rundown/ui-components';
import { parseSlackMrkdwn, getMessageUserDisplay } from '@slack-linear-rundown/utils';
import styles from './MessageViewModal.module.css';

interface MessageViewModalProps {
  message: Message | null;
  showRawText: boolean;
  onClose: () => void;
  onToggleRawText: () => void;
}

export function MessageViewModal({
  message,
  showRawText,
  onClose,
  onToggleRawText,
}: MessageViewModalProps) {
  if (!message) return null;

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Message to ${getMessageUserDisplay(message)}`}
      size="lg"
      footer={
        <>
          <button className={styles.toggleButton} onClick={onToggleRawText}>
            {showRawText ? 'View Rendered' : 'View Raw Text'}
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {showRawText ? (
        <pre className={styles.rawText}>{message.message_content}</pre>
      ) : (
        <div className={styles.renderedMessage}>
          {message.message_content?.split('\n').map(renderMessageLine)}
        </div>
      )}
    </Modal>
  );
}
