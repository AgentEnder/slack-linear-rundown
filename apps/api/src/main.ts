import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as cron from 'node-cron';
import path, { isAbsolute } from 'path';
import { environment } from './environment/environment';
import { logger } from './app/utils/logger';
import { requestLogging } from './app/middleware/logging';
import { errorHandler, notFoundHandler } from './app/middleware/error-handler';
import {
  healthRouter,
  cooldownRouter,
  reportRouter,
  slackRouter,
  adminRouter,
  jobsRouter,
  userRouter,
  authRouter,
  syncRouter,
} from './app/routes/index';
import {
  initializeDatabase,
  runMigrations,
  closeDatabase,
  EncryptedConfigService,
} from '@slack-linear-rundown/database';
import { SlackClient } from '@slack-linear-rundown/slack';
import { LinearClient } from '@slack-linear-rundown/linear';
import { initWeeklyReportJob, initUserSyncJob } from './app/jobs/index';

const app = express();

// Global references for cleanup
let weeklyReportJob: cron.ScheduledTask | null = null;
let userSyncJob: cron.ScheduledTask | null = null;

/**
 * Helper to get configuration value from database or environment
 * Tries database first (if encryption key is available), falls back to environment variables
 */
async function getConfigValue(key: string): Promise<string | null> {
  let value: string | null = null;

  // Only check database if encryption key is available
  if (environment.ENCRYPTION_KEY) {
    try {
      const dbKey = await EncryptedConfigService.getSource(key);

      if (dbKey) {
        try {
          value = await EncryptedConfigService.get(
            key,
            environment.ENCRYPTION_KEY
          );
          logger.info(`Retrieved ${key} from database`);
        } catch (error) {
          logger.error(`Failed to decrypt ${key} from database`, { error });
          // Continue to environment fallback
        }
      }
    } catch (error) {
      logger.error(`Error checking database for ${key}`, { error });
      // Continue to environment fallback
    }
  }

  // If not in database, check environment variables
  if (!value) {
    const envValue = environment[key as keyof typeof environment];
    if (envValue !== undefined && envValue !== null && envValue !== '') {
      value = String(envValue);
      logger.info(`Retrieved ${key} from environment variables`);
    }
  }

  return value;
}

async function initializeApp(): Promise<void> {
  logger.info('Initializing application...');

  // Initialize database
  try {
    const dbPath = isAbsolute(environment.DATABASE_PATH)
      ? environment.DATABASE_PATH
      : path.join(process.cwd(), environment.DATABASE_PATH);

    logger.info('Initializing database...', {
      path: dbPath,
      isAbsolute: isAbsolute(environment.DATABASE_PATH),
      cwd: process.cwd(),
    });

    initializeDatabase(dbPath);
    logger.info('Database connection created, running migrations...');

    await runMigrations();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorName: error instanceof Error ? error.name : undefined,
      errorStack: error instanceof Error ? error.stack : undefined,
      errorDetails:
        error instanceof Error
          ? JSON.stringify(error, Object.getOwnPropertyNames(error))
          : String(error),
      databasePath: environment.DATABASE_PATH,
    });
    throw error;
  }

  // Middleware
  app.use(express.json());
  app.use(cors());
  app.use(cookieParser());
  app.use(requestLogging);

  // In production, serve static files for admin and user interfaces
  // In development, Caddy reverse proxy handles routing to Vite dev servers
  if (environment.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, 'app', 'public');
    const userPublicPath = path.join(__dirname, 'app', 'public-user');

    app.use('/public', express.static(publicPath));
    app.use('/assets', express.static(path.join(publicPath, 'assets')));

    app.get('/admin', (_req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });

    // Serve user app static files
    app.use('/user', express.static(userPublicPath));
    app.get('/user/*', (_req, res) => {
      res.sendFile(path.join(userPublicPath, 'index.html'));
    });

    logger.info('Production mode: serving static files', {
      publicPath,
      userPublicPath,
    });
  } else {
    logger.info(
      'Development mode: Caddy reverse proxy handles routing to Vite dev servers'
    );
  }

  // API Routes
  app.use('/api', healthRouter);
  app.use('/api', cooldownRouter);
  app.use('/api', reportRouter);
  app.use('/api', adminRouter);
  app.use('/api', jobsRouter);
  app.use('/api', userRouter);
  app.use('/api/sync-status', syncRouter); // Sync status endpoints
  app.use('/auth', authRouter); // Auth routes (OAuth)
  app.use('/slack', slackRouter);

  // Root endpoint
  app.get('/', (_req, res) => {
    res.json({
      message: 'Slack Linear Rundown API',
      version: '0.0.1',
      status: 'running',
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Application initialized successfully');
}

async function startServer(): Promise<void> {
  try {
    await initializeApp();

    // Start HTTP server
    // In development, Caddy handles HTTPS and reverse proxying
    // In production, use a reverse proxy (nginx, Traefik, Caddy, etc.) for SSL termination
    const server = app.listen(environment.PORT, () => {
      logger.info(`Server started`, {
        port: environment.PORT,
        nodeEnv: environment.NODE_ENV,
        url: `http://localhost:${environment.PORT}`,
        note:
          environment.NODE_ENV === 'development'
            ? 'Access via Caddy at https://localhost'
            : 'Use reverse proxy for HTTPS in production',
      });
    });

    // Initialize scheduled jobs after server starts
    try {
      logger.info('Initializing scheduled jobs...');

      // Get credentials from database or environment
      const slackBotToken = await getConfigValue('SLACK_BOT_TOKEN');
      const linearApiKey = await getConfigValue('LINEAR_API_KEY');
      const reportSchedule = await getConfigValue('REPORT_SCHEDULE');
      const githubToken = await getConfigValue('GITHUB_TOKEN');
      const encryptionKey = await getConfigValue('ENCRYPTION_KEY');

      // Only initialize jobs if credentials are available
      if (!slackBotToken) {
        logger.warn(
          'Slack bot token not configured - skipping scheduled jobs initialization'
        );
        logger.info(
          `Configure credentials via the admin UI at https://localhost/admin`
        );
      } else if (!linearApiKey) {
        logger.warn(
          'Linear API key not configured - skipping scheduled jobs initialization'
        );
        logger.info(
          `Configure credentials via the admin UI at https://localhost/admin`
        );
      } else {
        // Initialize Slack and Linear clients
        const slackClient = new SlackClient({
          botToken: slackBotToken,
        });

        const linearClient = new LinearClient({
          apiKey: linearApiKey,
        });

        // Initialize weekly report job
        weeklyReportJob = initWeeklyReportJob(
          slackClient,
          linearClient,
          reportSchedule || environment.REPORT_SCHEDULE,
          {
            encryptionKey: encryptionKey || undefined,
            sharedGitHubToken: githubToken || undefined,
          }
        );

        // Initialize user sync job (daily at 2AM) with Linear client for user matching
        userSyncJob = initUserSyncJob(slackClient, linearClient);

        logger.info('All scheduled jobs initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize scheduled jobs', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't exit - server can still run without jobs
    }

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Stop cron jobs
      if (weeklyReportJob) {
        logger.info('Stopping weekly report job...');
        weeklyReportJob.stop();
      }

      if (userSyncJob) {
        logger.info('Stopping user sync job...');
        userSyncJob.stop();
      }

      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
        await closeDatabase();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database', { error });
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();
