/**
 * Slack-related utility functions
 */

/**
 * Parse Slack mrkdwn format and convert links to HTML
 * Slack format: <url|text> or <url>
 */
export function parseSlackMrkdwn(text: string): string {
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
}
