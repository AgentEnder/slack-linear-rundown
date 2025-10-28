import { z } from 'zod';
// import * as dotenv from 'dotenv';

// dotenv.config();

const EnvironmentSchema = z.object({
  // Required
  SLACK_BOT_TOKEN: z.string().min(1, 'SLACK_BOT_TOKEN is required'),
  LINEAR_API_KEY: z.string().min(1, 'LINEAR_API_KEY is required'),
  SLACK_SIGNING_SECRET: z.string().min(1, 'SLACK_SIGNING_SECRET is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // OAuth - required for Sign in with Slack
  SLACK_CLIENT_ID: z.string().min(1, 'SLACK_CLIENT_ID is required for OAuth'),
  SLACK_CLIENT_SECRET: z.string().min(1, 'SLACK_CLIENT_SECRET is required for OAuth'),

  // Optional with defaults
  DATABASE_PATH: z.string().default('./data/rundown.db'),
  PORT: z
    .string()
    .default('3001') // Runs on 3001, Caddy proxies from 443/80 in development
    .transform((val) => Number(val)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  REPORT_SCHEDULE: z.string().default('0 9 * * 1'), // Monday 9AM
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  API_URL: z.string().default('https://localhost'), // Caddy serves on standard HTTPS port
  SLACK_OAUTH_REDIRECT_URI: z.string().optional(), // Falls back to API_URL/auth/slack/callback

  // Optional - used for admin config encryption
  ENCRYPTION_KEY: z.string().optional(),
});

type Environment = z.infer<typeof EnvironmentSchema>;

console.log(process.env.DATABASE_PATH);

function validateEnvironment(): Environment {
  try {
    return EnvironmentSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(
        (issue) => `${issue.path.join('.')}: ${issue.message}`
      );
      throw new Error(
        `Environment validation failed:\n${missingVars.join('\n')}`
      );
    }
    throw error;
  }
}

export const environment = validateEnvironment();
