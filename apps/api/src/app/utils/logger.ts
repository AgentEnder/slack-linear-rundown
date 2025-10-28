import winston from 'winston';
import { environment } from '../../environment/environment';

const isProduction = environment.NODE_ENV === 'production';

const format = isProduction
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );

export const logger = winston.createLogger({
  level: environment.LOG_LEVEL,
  format,
  transports: [
    new winston.transports.Console(),
  ],
});
