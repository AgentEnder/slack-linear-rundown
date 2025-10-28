/**
 * Tests for encryption utilities.
 */

import { describe, it, expect } from '@jest/globals';
import {
  encrypt,
  decrypt,
  validateEncryptionKey,
  generateKey,
} from './encryption.js';

describe('Encryption', () => {
  const validKey = 'a'.repeat(64); // 64 hex characters = 32 bytes
  const testData = 'sensitive information that needs encryption';

  describe('validateEncryptionKey', () => {
    it('should validate a correct 64-character hex key', () => {
      expect(validateEncryptionKey(validKey)).toBe(true);
    });

    it('should reject keys that are too short', () => {
      expect(validateEncryptionKey('a'.repeat(63))).toBe(false);
    });

    it('should reject keys that are too long', () => {
      expect(validateEncryptionKey('a'.repeat(65))).toBe(false);
    });

    it('should reject non-hex characters', () => {
      expect(validateEncryptionKey('z'.repeat(64))).toBe(false);
      expect(validateEncryptionKey('g'.repeat(64))).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateEncryptionKey(123 as any)).toBe(false);
      expect(validateEncryptionKey(null as any)).toBe(false);
      expect(validateEncryptionKey(undefined as any)).toBe(false);
    });

    it('should accept mixed case hex', () => {
      const mixedKey = 'a0B1c2D3e4F5'.repeat(5) + 'abcd';
      expect(validateEncryptionKey(mixedKey)).toBe(true);
    });
  });

  describe('generateKey', () => {
    it('should generate a valid 64-character hex key', () => {
      const key = generateKey();
      expect(key).toHaveLength(64);
      expect(validateEncryptionKey(key)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encrypt(testData, validKey);

      expect(encrypted.iv).toHaveLength(24); // 12 bytes in hex
      expect(encrypted.encryptedData).toBeTruthy();
      expect(encrypted.authTag).toHaveLength(32); // 16 bytes in hex

      const decrypted = decrypt(encrypted, validKey);
      expect(decrypted).toBe(testData);
    });

    it('should produce different IVs for each encryption', () => {
      const encrypted1 = encrypt(testData, validKey);
      const encrypted2 = encrypt(testData, validKey);

      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('', validKey);
      const decrypted = decrypt(encrypted, validKey);
      expect(decrypted).toBe('');
    });

    it('should handle unicode characters', () => {
      const unicodeData = 'Hello 世界 🌍 Привет';
      const encrypted = encrypt(unicodeData, validKey);
      const decrypted = decrypt(encrypted, validKey);
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle long strings', () => {
      const longData = 'x'.repeat(10000);
      const encrypted = encrypt(longData, validKey);
      const decrypted = decrypt(encrypted, validKey);
      expect(decrypted).toBe(longData);
    });

    it('should throw error with invalid encryption key', () => {
      expect(() => encrypt(testData, 'invalid-key')).toThrow(
        'Invalid encryption key'
      );
    });

    it('should throw error with invalid decryption key', () => {
      const encrypted = encrypt(testData, validKey);
      expect(() => decrypt(encrypted, 'invalid-key')).toThrow(
        'Invalid encryption key'
      );
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = encrypt(testData, validKey);
      const wrongKey = 'b'.repeat(64);

      expect(() => decrypt(encrypted, wrongKey)).toThrow('Decryption failed');
    });

    it('should fail decryption with tampered data', () => {
      const encrypted = encrypt(testData, validKey);

      // Tamper with encrypted data
      const tamperedData = encrypted.encryptedData.replace('a', 'b');
      const tampered = {
        ...encrypted,
        encryptedData: tamperedData,
      };

      expect(() => decrypt(tampered, validKey)).toThrow('Decryption failed');
    });

    it('should fail decryption with tampered IV', () => {
      const encrypted = encrypt(testData, validKey);

      // Tamper with IV - flip first character
      const tamperedIV =
        (encrypted.iv[0] === '0' ? '1' : '0') + encrypted.iv.slice(1);
      const tampered = {
        ...encrypted,
        iv: tamperedIV,
      };

      // Wrong IV should produce wrong result or throw
      try {
        const result = decrypt(tampered, validKey);
        // If it doesn't throw, the result should be different
        expect(result).not.toBe(testData);
      } catch (error) {
        // It's acceptable if it throws
        expect(error).toBeDefined();
      }
    });

    it('should fail decryption with tampered auth tag', () => {
      const encrypted = encrypt(testData, validKey);

      // Tamper with auth tag - flip first character
      const tamperedTag =
        (encrypted.authTag[0] === '0' ? '1' : '0') + encrypted.authTag.slice(1);
      const tampered = {
        ...encrypted,
        authTag: tamperedTag,
      };

      // GCM auth tag verification should fail
      expect(() => decrypt(tampered, validKey)).toThrow();
    });

    it('should handle special characters and newlines', () => {
      const specialData = 'Line 1\nLine 2\tTab\r\nWindows\n{"json": "data"}';
      const encrypted = encrypt(specialData, validKey);
      const decrypted = decrypt(encrypted, validKey);
      expect(decrypted).toBe(specialData);
    });
  });

  describe('roundtrip with generated keys', () => {
    it('should work with generated keys', () => {
      const key = generateKey();
      const encrypted = encrypt(testData, key);
      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(testData);
    });

    it('should support multiple different keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      const data1 = 'encrypted with key 1';
      const data2 = 'encrypted with key 2';

      const encrypted1 = encrypt(data1, key1);
      const encrypted2 = encrypt(data2, key2);

      expect(decrypt(encrypted1, key1)).toBe(data1);
      expect(decrypt(encrypted2, key2)).toBe(data2);

      // Wrong key combinations should fail
      expect(() => decrypt(encrypted1, key2)).toThrow();
      expect(() => decrypt(encrypted2, key1)).toThrow();
    });
  });
});
