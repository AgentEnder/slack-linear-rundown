import { Router, Request, Response } from 'express';
import { getDatabase } from '@slack-linear-rundown/database';
import { logger } from '../utils/logger';

export const healthRouter = Router();

healthRouter.get('/health', async (req: Request, res: Response) => {
  try {
    const health: {
      status: string;
      timestamp: string;
      database: string;
    } = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'unknown',
    };

    // Check database connectivity
    try {
      const db = getDatabase();
      await db.authenticate();
      health.database = 'ok';
    } catch (dbError) {
      health.database = 'error';
      health.status = 'degraded';
      logger.error('Database health check failed', { error: dbError });
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'unknown',
    });
  }
});
