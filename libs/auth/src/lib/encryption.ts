/**
 * Encryption Utilities
 * Helpers for encrypting and decrypting sensitive data (e.g., OAuth tokens)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Prepare encryption key
 * Ensures key is exactly 32 bytes for AES-256
 */
function prepareKey(key: string): Buffer {
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

/**
 * Encrypt a string
 * @param plaintext The string to encrypt
 * @param encryptionKey The encryption key (will be padded/truncated to 32 bytes)
 * @returns Encrypted string in format "iv:ciphertext"
 */
export function encrypt(plaintext: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, prepareKey(encryptionKey), iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a string
 * @param encryptedData The encrypted string in format "iv:ciphertext"
 * @param encryptionKey The encryption key (will be padded/truncated to 32 bytes)
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];

  const decipher = crypto.createDecipheriv(ALGORITHM, prepareKey(encryptionKey), iv);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
