import { useState, ReactNode } from 'react';
import styles from './ReportPreviewModal.module.css';

export interface ReportPreviewModalProps {
  userId: number;
  userName: string;
  onSendSuccess?: (result: {
    issuesCount: number;
    inCooldown: boolean;
  }) => void;
  onSendError?: (error: string) => void;
  children: (props: { onClick: () => void; disabled: boolean }) => ReactNode;
}

/**
 * Reusable component that handles the preview -> confirm -> send flow for reports.
 * Uses render props pattern for maximum flexibility in button rendering.
 *
 * @example
 * <ReportPreviewModal
 *   userId={user.id}
 *   userName={user.name}
 *   onSendSuccess={(result) => showSuccessMessage(result)}
 *   onSendError={(error) => showErrorMessage(error)}
 * >
 *   {({ onClick, disabled }) => (
 *     <button onClick={onClick} disabled={disabled}>
 *       Send Report
 *     </button>
 *   )}
 * </ReportPreviewModal>
 */
export default function ReportPreviewModal({
  userId,
  userName,
  onSendSuccess,
  onSendError,
  children,
}: ReportPreviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<{
    reportText: string;
    issuesCount: number;
    inCooldown: boolean;
  } | null>(null);

  const openPreview = async () => {
    setIsOpen(true);
    setLoading(true);
    setPreview(null);

    try {
      const response = await fetch('/api/preview-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setPreview({
          reportText: result.preview.reportText,
          issuesCount: result.preview.issuesCount,
          inCooldown: result.preview.inCooldown,
        });
      } else {
        const error = result.error || result.message || 'Failed to generate preview';
        onSendError?.(error);
        setIsOpen(false);
      }
    } catch (error) {
      const errorMessage = 'Network error: ' + (error as Error).message;
      onSendError?.(errorMessage);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (sending) return; // Prevent closing while sending
    setIsOpen(false);
    setPreview(null);
  };

  const confirmSend = async () => {
    if (!preview) return;

    setSending(true);

    try {
      const response = await fetch('/api/trigger-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const userResult = result.results[0];
        if (userResult.success) {
          onSendSuccess?.({
            issuesCount: userResult.issuesCount || 0,
            inCooldown: userResult.inCooldown || false,
          });
          setIsOpen(false);
          setPreview(null);
        } else {
          const error = `Failed to send report: ${userResult.error || 'Unknown error'}`;
          onSendError?.(error);
        }
      } else {
        const error = result.error || result.message || 'Failed to send report';
        onSendError?.(error);
      }
    } catch (error) {
      const errorMessage = 'Network error: ' + (error as Error).message;
      onSendError?.(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Helper function to parse Slack mrkdwn links
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

  const renderPreviewLine = (line: string, index: number) => {
    const parsedLine = parseSlackMrkdwn(line);
    return (
      <div
        key={index}
        dangerouslySetInnerHTML={{ __html: parsedLine || '&nbsp;' }}
      />
    );
  };

  return (
    <>
      {children({ onClick: openPreview, disabled: sending })}

      {isOpen && (
        <div className={styles.modal} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Report Preview for {userName}</h3>
              <button
                onClick={closeModal}
                className={styles.closeButton}
                aria-label="Close"
                disabled={sending}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {loading ? (
                <div className={styles.loading}>Loading preview...</div>
              ) : preview ? (
                <>
                  <div className={styles.previewInfo}>
                    <span className={styles.previewLabel}>Issues:</span>
                    <span className={styles.previewValue}>
                      {preview.issuesCount || 0}
                    </span>
                    {preview.inCooldown && (
                      <span className={styles.cooldownBadge}>In Cooldown</span>
                    )}
                  </div>
                  <div className={styles.previewMessage}>
                    {preview.reportText.split('\n').map(renderPreviewLine)}
                  </div>
                </>
              ) : (
                <div className={styles.empty}>No preview available</div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={closeModal}
                className={styles.cancelButton}
                disabled={sending}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                className={styles.sendButton}
                disabled={loading || !preview || sending}
                type="button"
              >
                {sending ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
