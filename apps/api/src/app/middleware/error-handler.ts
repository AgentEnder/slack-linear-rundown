import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn('Validation error', {
      path: req.path,
      errors: err.issues,
    });
    res.status(400).json({
      error: 'Validation error',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational !== undefined ? err.isOperational : statusCode < 500;

  // Log error
  if (isOperational) {
    logger.warn('Operational error', {
      statusCode,
      message: err.message,
      path: req.path,
    });
  } else {
    logger.error('Unexpected error', {
      statusCode,
      message: err.message,
      stack: err.stack,
      path: req.path,
    });
  }

  // Send response
  res.status(statusCode).json({
    error: isOperational ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
}
