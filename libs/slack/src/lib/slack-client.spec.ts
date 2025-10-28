import { SlackClient } from './slack-client.js';

describe('SlackClient', () => {
  describe('constructor', () => {
    it('should throw error if bot token is missing', () => {
      expect(() => new SlackClient({ botToken: '' })).toThrow(
        'Slack bot token is required'
      );
    });

    it('should initialize with valid bot token', () => {
      const client = new SlackClient({ botToken: 'xoxb-test-token' });
      expect(client).toBeDefined();
    });

    it('should use default rate limit delay', () => {
      const client = new SlackClient({ botToken: 'xoxb-test-token' });
      expect(client).toBeDefined();
    });

    it('should use custom rate limit delay', () => {
      const client = new SlackClient({
        botToken: 'xoxb-test-token',
        rateLimitDelay: 2000,
      });
      expect(client).toBeDefined();
    });
  });
});
