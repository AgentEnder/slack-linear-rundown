/**
 * Encrypted Config Service
 *
 * Provides helpers for storing and retrieving encrypted configuration values
 */

import { EncryptedConfig } from '../models/index.js';
import { encrypt, decrypt } from '../encryption.js';

/**
 * Store an encrypted configuration value
 */
export async function set(key: string, value: string, encryptionKey: string): Promise<void> {
  const encrypted = encrypt(value, encryptionKey);

  await EncryptedConfig.upsert({
    key,
    encrypted_value: encrypted.encryptedData,
    iv: encrypted.iv,
    auth_tag: encrypted.authTag,
  });
}

/**
 * Retrieve and decrypt a configuration value
 */
export async function get(key: string, encryptionKey: string): Promise<string | null> {
  const config = await EncryptedConfig.findByPk(key);

  if (!config) {
    return null;
  }

  try {
    return decrypt(
      {
        encryptedData: config.encrypted_value,
        iv: config.iv,
        authTag: config.auth_tag,
      },
      encryptionKey
    );
  } catch (error) {
    throw new Error(`Failed to decrypt config value for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete an encrypted configuration value
 */
export async function deleteKey(key: string): Promise<boolean> {
  const rowsDeleted = await EncryptedConfig.destroy({
    where: { key },
  });

  return rowsDeleted > 0;
}

/**
 * Get the source/key of a stored config (metadata only, not the value)
 */
export async function getSource(key: string): Promise<string | null> {
  const config = await EncryptedConfig.findByPk(key);
  return config ? key : null;
}
