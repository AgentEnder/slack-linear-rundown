import { EncryptedConfigService } from '@slack-linear-rundown/database';
import { Response } from 'express';
import { environment } from '../../environment/environment';
import { logger } from './logger';

/**
 * Helper to get encryption key or return 503
 */
export function getEncryptionKey(res: Response): string | null {
  if (!environment.ENCRYPTION_KEY) {
    res.status(503).json({
      error: 'Encryption key not configured',
      message:
        'Set ENCRYPTION_KEY environment variable to enable encrypted configuration storage',
      instructions: 'Generate a 32-byte key: openssl rand -hex 32',
    });
    return null;
  }
  return environment.ENCRYPTION_KEY;
}

/**
 * Helper to get configuration value from database or environment
 * Tries database first, falls back to environment variables
 */
export async function getConfigValue(
  key: string,
  encryptionKey: string
): Promise<string | null> {
  let value: string | null = null;

  // Check if config exists in database
  const dbKey = await EncryptedConfigService.getSource(key);

  // Try to get the value from database first
  if (dbKey) {
    try {
      value = await EncryptedConfigService.get(key, encryptionKey);
      logger.info(`Retrieved ${key} from database`);
    } catch (error) {
      logger.error(`Failed to decrypt ${key} from database`, { error });
      // Continue to environment fallback
    }
  }

  // If not in database, check environment variables
  if (!value && !dbKey) {
    const envValue = environment[key as keyof typeof environment];
    if (envValue !== undefined && envValue !== null && envValue !== '') {
      value = String(envValue);
      logger.info(`Retrieved ${key} from environment variables`);
    } else {
      logger.warn(
        `Configuration key ${key} not found in database or environment`
      );
    }
  }

  return value;
}
