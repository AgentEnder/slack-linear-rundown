/**
 * Message and delivery log types
 */

export interface Message {
  id: number;
  user_id: number;
  status: 'success' | 'failed';
  error_message: string | null;
  message_content: string | null;
  sent_at: string;
  user_email?: string;
  user_name?: string;
}
