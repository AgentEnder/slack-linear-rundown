#!/usr/bin/env ts-node
/**
 * Manual test script for Slack client
 *
 * This script tests the Slack API client to ensure it works correctly
 * with the real Slack API. It's meant to be run manually for validation,
 * not as part of automated testing.
 *
 * Usage:
 *   export SLACK_BOT_TOKEN="xoxb-your-bot-token"
 *   export TEST_SLACK_USER_ID="U12345678"  # Optional: specific user to test DM with
 *   npx ts-node tests/manual/test-slack-client.ts
 */

import { SlackClient } from '../../libs/slack/dist/lib/slack-client.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function logTest(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
}

function logSuccess(message: string, details?: any) {
  console.log(`✅ ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

function logError(message: string, error?: any) {
  console.error(`❌ ${message}`);
  if (error) {
    console.error('   Error:', error.message || error);
  }
}

async function testGetUsers(client: SlackClient): Promise<TestResult> {
  logTest('Get Users');

  try {
    const users = await client.getUsers();

    if (!Array.isArray(users)) {
      throw new Error('Users is not an array');
    }

    if (users.length === 0) {
      throw new Error('No users returned');
    }

    logSuccess(`Successfully fetched ${users.length} users`);

    // Show sample user
    const sampleUser = users[0];
    console.log('   Sample User:', {
      id: sampleUser.id,
      realName: sampleUser.realName,
      email: sampleUser.email,
      profile: sampleUser.profile,
    });

    // Validate user structure
    for (const user of users) {
      if (!user.id) {
        throw new Error('User missing required id field');
      }
    }

    logSuccess('All users have required fields');

    return {
      name: 'Get Users',
      passed: true,
      details: {
        totalUsers: users.length,
      },
    };
  } catch (error: any) {
    logError('Failed to fetch users', error);
    return {
      name: 'Get Users',
      passed: false,
      error: error.message,
    };
  }
}

async function testSendDM(client: SlackClient, testUserId?: string): Promise<TestResult> {
  logTest('Send Direct Message');

  if (!testUserId) {
    console.log('⚠️  Skipping DM test - no TEST_SLACK_USER_ID provided');
    console.log('   To test sending DMs, set TEST_SLACK_USER_ID environment variable');
    return {
      name: 'Send Direct Message',
      passed: true,
      details: { skipped: true },
    };
  }

  try {
    const testMessage = `
🧪 **Test Message from Slack Linear Rundown**

This is an automated test message to verify the Slack integration is working correctly.

Time: ${new Date().toISOString()}
Test: Send DM

If you received this message, the Slack bot is configured correctly! ✅
    `.trim();

    console.log(`   Sending test message to user: ${testUserId}`);

    await client.sendDM(testUserId, { text: testMessage });

    logSuccess('Successfully sent DM to user', { userId: testUserId });

    return {
      name: 'Send Direct Message',
      passed: true,
      details: { userId: testUserId },
    };
  } catch (error: any) {
    logError('Failed to send DM', error);
    return {
      name: 'Send Direct Message',
      passed: false,
      error: error.message,
    };
  }
}

async function testRateLimiting(client: SlackClient): Promise<TestResult> {
  logTest('Rate Limiting');

  try {
    // Test that rate limiting is configured
    // We don't actually hit the rate limit, just verify the client is set up correctly
    const rateLimit = (client as any).rateLimiter;

    if (!rateLimit) {
      console.log('⚠️  No rate limiter found on client');
    } else {
      logSuccess('Rate limiter is configured');
    }

    return {
      name: 'Rate Limiting',
      passed: true,
      details: { configured: !!rateLimit },
    };
  } catch (error: any) {
    logError('Failed to check rate limiting', error);
    return {
      name: 'Rate Limiting',
      passed: false,
      error: error.message,
    };
  }
}

async function testAuthTest(client: SlackClient): Promise<TestResult> {
  logTest('Auth Test');

  try {
    // Call auth.test to verify token is valid
    const webClient = (client as any).client;
    const authResponse = await webClient.auth.test();

    if (!authResponse.ok) {
      throw new Error('Auth test failed');
    }

    logSuccess('Successfully authenticated with Slack', {
      teamId: authResponse.team_id,
      team: authResponse.team,
      userId: authResponse.user_id,
      user: authResponse.user,
      botId: authResponse.bot_id,
    });

    return {
      name: 'Auth Test',
      passed: true,
      details: {
        team: authResponse.team,
        user: authResponse.user,
      },
    };
  } catch (error: any) {
    logError('Auth test failed', error);
    return {
      name: 'Auth Test',
      passed: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            Slack Client Manual Test Suite                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check for bot token
  const botToken = process.env.SLACK_BOT_TOKEN;
  if (!botToken) {
    console.error('\n❌ ERROR: SLACK_BOT_TOKEN environment variable not set');
    console.error('   Please set it before running tests:');
    console.error('   export SLACK_BOT_TOKEN="xoxb-your-token"\n');
    process.exit(1);
  }

  console.log('\n✓ Slack bot token found');

  // Check for optional test user ID
  const testUserId = process.env.TEST_SLACK_USER_ID;
  if (testUserId) {
    console.log(`✓ Test user ID found: ${testUserId}`);
  } else {
    console.log('⚠️  No TEST_SLACK_USER_ID set - DM test will be skipped');
  }
  console.log('');

  // Create client
  const client = new SlackClient({ botToken });

  // Run all tests
  results.push(await testAuthTest(client));
  results.push(await testGetUsers(client));
  results.push(await testRateLimiting(client));
  results.push(await testSendDM(client, testUserId));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const skipped = result.details?.skipped ? ' (SKIPPED)' : '';
    console.log(`${status} - ${result.name}${skipped}`);
    if (result.error) {
      console.log(`       Error: ${result.error}`);
    }
  });

  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60) + '\n');

  // Exit with appropriate code
  if (failed > 0) {
    console.error('❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Unexpected error running tests:', error);
  process.exit(1);
});
