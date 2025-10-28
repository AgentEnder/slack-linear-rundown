/**
 * Encryption utilities for secure storage of sensitive configuration data.
 *
 * Uses AES-256-GCM for authenticated encryption, providing both
 * confidentiality and integrity protection.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encrypted data structure containing all components needed for decryption.
 */
export interface EncryptedData {
  /** Initialization vector (IV) - 12 bytes for GCM mode */
  iv: string;
  /** Encrypted data in hex format */
  encryptedData: string;
  /** Authentication tag for integrity verification - 16 bytes */
  authTag: string;
}

/**
 * Validates that the encryption key is properly formatted.
 * Key must be a 64-character hex string representing 32 bytes.
 *
 * @param key - The encryption key to validate
 * @returns true if key is valid, false otherwise
 */
export function validateEncryptionKey(key: string): boolean {
  // Key must be 64 hex characters (32 bytes)
  if (typeof key !== 'string') {
    return false;
  }

  if (key.length !== 64) {
    return false;
  }

  // Must be valid hex
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Encrypts plaintext using AES-256-GCM.
 *
 * @param plaintext - The data to encrypt
 * @param key - 32-byte encryption key as a hex string (64 characters)
 * @returns Object containing IV, encrypted data, and auth tag
 * @throws Error if key is invalid or encryption fails
 */
export function encrypt(plaintext: string, key: string): EncryptedData {
  if (!validateEncryptionKey(key)) {
    throw new Error(
      'Invalid encryption key: must be 64-character hex string (32 bytes)'
    );
  }

  // Convert hex key to buffer
  const keyBuffer = Buffer.from(key, 'hex');

  // Generate random 12-byte IV (recommended for GCM)
  const iv = randomBytes(12);

  try {
    // Create cipher
    const cipher = createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decrypts data encrypted with AES-256-GCM.
 *
 * @param encrypted - Object containing IV, encrypted data, and auth tag
 * @param key - 32-byte encryption key as a hex string (64 characters)
 * @returns The decrypted plaintext
 * @throws Error if key is invalid, authentication fails, or decryption fails
 */
export function decrypt(encrypted: EncryptedData, key: string): string {
  if (!validateEncryptionKey(key)) {
    throw new Error(
      'Invalid encryption key: must be 64-character hex string (32 bytes)'
    );
  }

  // Convert hex key to buffer
  const keyBuffer = Buffer.from(key, 'hex');

  // Convert components from hex to buffers
  const iv = Buffer.from(encrypted.iv, 'hex');
  const authTag = Buffer.from(encrypted.authTag, 'hex');

  try {
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', keyBuffer, iv);

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    // GCM mode will throw if authentication fails
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Generates a random 32-byte encryption key.
 * Returns the key as a hex string (64 characters).
 *
 * @returns A random 32-byte key as hex string
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex');
}
