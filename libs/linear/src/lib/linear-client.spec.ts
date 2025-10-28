import { LinearClient } from './linear-client.js';

describe('LinearClient', () => {
  it('should initialize with API key', () => {
    const client = new LinearClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
  });

  it('should use custom endpoint if provided', () => {
    const client = new LinearClient({
      apiKey: 'test-key',
      endpoint: 'https://custom.linear.app/graphql',
    });
    expect(client).toBeDefined();
  });
});
