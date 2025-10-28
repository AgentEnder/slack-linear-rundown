# Manual Integration Tests

This directory contains manual test scripts for validating integrations with external services (Linear and Slack). These tests are designed to be run manually against real APIs to verify that queries and operations work correctly.

**Important:** These are NOT automated tests. They require real API credentials and should be run manually when validating changes to API clients or queries.

## Prerequisites

1. **Install dependencies** (from repository root):
   ```bash
   pnpm install
   ```

2. **Build the project** (from repository root):
   ```bash
   nx build api
   ```

3. **Set up environment variables** with your API credentials (see below)

## Test Scripts

### 1. Linear GraphQL Queries Test

Tests all Linear API queries to ensure they work correctly.

**What it tests:**
- `getCurrentUser()` - Verifies the authenticated user can be fetched
- `getAllAssignedIssues()` - Validates issue fetching and client-side filtering
- `getAllUsers()` - Confirms workspace user enumeration works

**Setup:**
```bash
export LINEAR_API_KEY="lin_api_..."
```

**Run:**
```bash
npx ts-node tests/manual/test-linear-queries.ts
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║          Linear GraphQL Queries Manual Test Suite          ║
╚════════════════════════════════════════════════════════════╝

✓ Linear API key found
✓ Using endpoint: https://api.linear.app/graphql

============================================================
TEST: Get Current User
============================================================
✅ Successfully fetched current user
   Details: {
     "id": "...",
     "name": "...",
     "email": "..."
   }

============================================================
TEST: Get All Assigned Issues
============================================================
✅ Successfully fetched 42 assigned issues
   Statistics: {
     "total": 42,
     "open": 38,
     "completed": 4,
     "canceled": 0
   }
   Sample Issue: {
     "identifier": "ENG-123",
     "title": "...",
     "state": "In Progress",
     "stateType": "started",
     "priority": 2,
     "project": "Q1 Sprint",
     "team": "Engineering"
   }
✅ All issues pass filtering validation

============================================================
TEST: Get All Users
============================================================
✅ Successfully fetched 25 users
   Statistics: {
     "total": 25,
     "active": 23,
     "withEmail": 25
   }
   Sample User: {
     "id": "...",
     "name": "...",
     "email": "user@example.com",
     "active": true
   }
✅ All users have required fields

============================================================
TEST SUMMARY
============================================================
✅ PASS - Get Current User
✅ PASS - Get All Assigned Issues
✅ PASS - Get All Users

------------------------------------------------------------
Total: 3 | Passed: 3 | Failed: 0
------------------------------------------------------------

✅ All tests passed!
```

---

### 2. Slack Client Test

Tests the Slack API client to ensure it works correctly.

**What it tests:**
- `auth.test` - Verifies the bot token is valid
- `getUsers()` - Validates workspace user fetching
- Rate limiting configuration
- `sendDM()` - Optionally sends a test DM to verify messaging works

**Setup:**
```bash
export SLACK_BOT_TOKEN="xoxb-..."

# Optional: To test sending a DM
export TEST_SLACK_USER_ID="U12345678"
```

**Run:**
```bash
npx ts-node tests/manual/test-slack-client.ts
```

**Expected output:**
```
╔════════════════════════════════════════════════════════════╗
║            Slack Client Manual Test Suite                  ║
╚════════════════════════════════════════════════════════════╝

✓ Slack bot token found
✓ Test user ID found: U12345678

============================================================
TEST: Auth Test
============================================================
✅ Successfully authenticated with Slack
   Details: {
     "teamId": "...",
     "team": "...",
     "userId": "...",
     "user": "...",
     "botId": "..."
   }

============================================================
TEST: Get Users
============================================================
✅ Successfully fetched 42 users
   Statistics: {
     "total": 42,
     "active": 38,
     "bots": 3,
     "deleted": 1
   }
   Sample User: {
     "id": "U12345678",
     "realName": "John Doe",
     "email": "john@example.com",
     "isBot": false,
     "deleted": false
   }
✅ All users have required fields

============================================================
TEST: Rate Limiting
============================================================
✅ Rate limiter is configured

============================================================
TEST: Send Direct Message
============================================================
   Sending test message to user: U12345678
✅ Successfully sent DM to user
   Details: {
     "userId": "U12345678"
   }

============================================================
TEST SUMMARY
============================================================
✅ PASS - Auth Test
✅ PASS - Get Users
✅ PASS - Rate Limiting
✅ PASS - Send Direct Message

------------------------------------------------------------
Total: 4 | Passed: 4 | Failed: 0
------------------------------------------------------------

✅ All tests passed!
```

---

## When to Run These Tests

Run these manual tests when:

1. **Modifying GraphQL queries** - Run `test-linear-queries.ts` to ensure queries still work
2. **Updating Linear client** - Verify all methods still function correctly
3. **Changing Slack integration** - Test that user fetching and messaging still works
4. **Debugging API issues** - Use these tests to isolate problems with the integrations
5. **After major dependency updates** - Verify external API clients still work
6. **Setting up a new environment** - Confirm credentials and network access are correct

## Getting API Credentials

### Linear API Key

1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Click "Create new key"
3. Copy the key (starts with `lin_api_`)
4. Set as environment variable: `export LINEAR_API_KEY="lin_api_..."`

### Slack Bot Token

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your app
3. Go to "OAuth & Permissions"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
5. Set as environment variable: `export SLACK_BOT_TOKEN="xoxb-..."`

### Finding Your Slack User ID

To test sending DMs, you need a Slack user ID:

1. In Slack, click on your profile
2. Click "More" → "Copy member ID"
3. Set as environment variable: `export TEST_SLACK_USER_ID="U..."`

## Troubleshooting

### "LINEAR_API_KEY environment variable not set"

Make sure you've exported the environment variable in your current shell session:
```bash
export LINEAR_API_KEY="lin_api_your_key_here"
```

### "SLACK_BOT_TOKEN environment variable not set"

Make sure you've exported the bot token:
```bash
export SLACK_BOT_TOKEN="xoxb-your-token-here"
```

### "GraphQL Error (Code: 400)"

This usually means:
- The query syntax is invalid
- The API doesn't support the query structure
- Check the error details in the test output

### "No users returned"

For Linear:
- Verify your API key is valid and not expired
- Check you have permission to view workspace users

For Slack:
- Verify your bot has `users:read` and `users:read.email` scopes
- Check the bot is installed in your workspace

### TypeScript compilation errors

Make sure you've built the project first:
```bash
nx build api
```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed or error occurred

This allows you to use these scripts in CI/CD pipelines if desired.

## Adding New Tests

To add a new test:

1. Create a new async function following the pattern:
   ```typescript
   async function testYourFeature(client: Client): Promise<TestResult> {
     logTest('Your Feature Name');
     try {
       // Your test logic here
       logSuccess('Test passed');
       return { name: 'Your Feature Name', passed: true };
     } catch (error: any) {
       logError('Test failed', error);
       return { name: 'Your Feature Name', passed: false, error: error.message };
     }
   }
   ```

2. Add the test to the `runTests()` function:
   ```typescript
   results.push(await testYourFeature(client));
   ```

3. Run the test script to verify it works
