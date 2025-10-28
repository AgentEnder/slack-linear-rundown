#!/usr/bin/env ts-node
/**
 * Manual test script for Linear GraphQL queries
 *
 * This script tests all Linear API queries to ensure they work correctly
 * with the real Linear API. It's meant to be run manually for validation,
 * not as part of automated testing.
 *
 * Usage:
 *   export LINEAR_API_KEY="your-api-key"
 *   npx ts-node tests/manual/test-linear-queries.ts
 */

import { LinearClient } from '../../libs/linear/dist/lib/linear-client.js';

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

async function testGetCurrentUser(client: LinearClient): Promise<TestResult> {
  logTest('Get Current User');

  try {
    const user = await client.getCurrentUser();

    if (!user) {
      throw new Error('No user returned');
    }

    if (!user.id || !user.name) {
      throw new Error('User missing required fields (id, name)');
    }

    logSuccess('Successfully fetched current user', {
      id: user.id,
      name: user.name,
      email: user.email,
    });

    return {
      name: 'Get Current User',
      passed: true,
      details: { userId: user.id, userName: user.name },
    };
  } catch (error: any) {
    logError('Failed to fetch current user', error);
    return {
      name: 'Get Current User',
      passed: false,
      error: error.message,
    };
  }
}

async function testGetAllAssignedIssues(client: LinearClient): Promise<TestResult> {
  logTest('Get All Assigned Issues');

  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const issues = await client.getAllAssignedIssues(oneMonthAgo);

    if (!Array.isArray(issues)) {
      throw new Error('Issues is not an array');
    }

    logSuccess(`Successfully fetched ${issues.length} assigned issues`);

    // Show some statistics
    const openIssues = issues.filter(i => i.state.type !== 'completed' && i.state.type !== 'canceled');
    const completedIssues = issues.filter(i => i.state.type === 'completed');
    const canceledIssues = issues.filter(i => i.state.type === 'canceled');

    console.log('   Statistics:', {
      total: issues.length,
      open: openIssues.length,
      completed: completedIssues.length,
      canceled: canceledIssues.length,
    });

    // Show sample issue if available
    if (issues.length > 0) {
      const sample = issues[0];
      console.log('   Sample Issue:', {
        identifier: sample.identifier,
        title: sample.title,
        state: sample.state.name,
        stateType: sample.state.type,
        priority: sample.priority,
        project: sample.project?.name,
        team: sample.team?.name,
      });
    }

    // Validate filtering logic
    const oneMonthAgoTime = oneMonthAgo.getTime();

    for (const issue of issues) {
      const isOpen = issue.state.type !== 'completed' && issue.state.type !== 'canceled';
      const recentlyUpdated = new Date(issue.updatedAt).getTime() >= oneMonthAgoTime;

      if (!isOpen && !recentlyUpdated) {
        throw new Error(
          `Issue ${issue.identifier} should have been filtered out (state: ${issue.state.type}, updatedAt: ${issue.updatedAt})`
        );
      }
    }

    logSuccess('All issues pass filtering validation');

    return {
      name: 'Get All Assigned Issues',
      passed: true,
      details: {
        totalIssues: issues.length,
        openIssues: openIssues.length,
        completedIssues: completedIssues.length,
      },
    };
  } catch (error: any) {
    logError('Failed to fetch assigned issues', error);
    return {
      name: 'Get All Assigned Issues',
      passed: false,
      error: error.message,
    };
  }
}

async function testGetAllUsers(client: LinearClient): Promise<TestResult> {
  logTest('Get All Users');

  try {
    const users = await client.getAllUsers();

    if (!Array.isArray(users)) {
      throw new Error('Users is not an array');
    }

    logSuccess(`Successfully fetched ${users.length} users`);

    // Show statistics
    const activeUsers = users.filter(u => u.active !== false);
    const usersWithEmail = users.filter(u => u.email);

    console.log('   Statistics:', {
      total: users.length,
      active: activeUsers.length,
      withEmail: usersWithEmail.length,
    });

    // Show sample user if available
    if (users.length > 0) {
      const sample = users[0];
      console.log('   Sample User:', {
        id: sample.id,
        name: sample.name,
        email: sample.email || '(no email)',
        active: sample.active !== false,
      });
    }

    // Validate user structure
    for (const user of users) {
      if (!user.id || !user.name) {
        throw new Error(`User missing required fields: ${JSON.stringify(user)}`);
      }
    }

    logSuccess('All users have required fields');

    return {
      name: 'Get All Users',
      passed: true,
      details: {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
      },
    };
  } catch (error: any) {
    logError('Failed to fetch users', error);
    return {
      name: 'Get All Users',
      passed: false,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Linear GraphQL Queries Manual Test Suite          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Check for API key
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error('\n❌ ERROR: LINEAR_API_KEY environment variable not set');
    console.error('   Please set it before running tests:');
    console.error('   export LINEAR_API_KEY="your-api-key"\n');
    process.exit(1);
  }

  console.log('\n✓ Linear API key found');
  console.log(`✓ Using endpoint: https://api.linear.app/graphql\n`);

  // Create client
  const client = new LinearClient({ apiKey });

  // Run all tests
  results.push(await testGetCurrentUser(client));
  results.push(await testGetAllAssignedIssues(client));
  results.push(await testGetAllUsers(client));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
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
