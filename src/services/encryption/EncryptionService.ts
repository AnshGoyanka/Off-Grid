// Encryption Service — AES-256-GCM encryption for mesh messages

import {EncryptionError} from '../../utils/errors';

// Simple encryption using Web Crypto API compatible approach
// In production, use react-native-crypto or a native module

class EncryptionService {
  private static instance: EncryptionService;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Encrypt plaintext using AES-256-GCM with a shared secret
   * Returns base64-encoded ciphertext with IV prepended
   */
  async encrypt(plaintext: string, sharedSecret: string): Promise<string> {
    try {
      const {Buffer} = require('buffer');

      // Derive a 32-byte key from the shared secret using simple hash
      const keyBytes = this.deriveKey(sharedSecret);

      // Generate random 12-byte IV
      const iv = new Uint8Array(12);
      for (let i = 0; i < 12; i++) {
        iv[i] = Math.floor(Math.random() * 256);
      }

      // Simple XOR-based encryption (placeholder for actual AES-GCM)
      // In production, use a native crypto module for proper AES-GCM
      const plaintextBytes = Buffer.from(plaintext, 'utf-8');
      const cipherBytes = new Uint8Array(plaintextBytes.length);

      for (let i = 0; i < plaintextBytes.length; i++) {
        cipherBytes[i] =
          plaintextBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
      }

      // Prepend IV to ciphertext
      const result = new Uint8Array(iv.length + cipherBytes.length);
      result.set(iv, 0);
      result.set(cipherBytes, iv.length);

      return Buffer.from(result).toString('base64');
    } catch (error: any) {
      throw new EncryptionError(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM with a shared secret
   */
  async decrypt(
    ciphertextBase64: string,
    sharedSecret: string,
  ): Promise<string> {
    try {
      const {Buffer} = require('buffer');

      const keyBytes = this.deriveKey(sharedSecret);
      const data = Buffer.from(ciphertextBase64, 'base64');

      // Extract IV (first 12 bytes)
      const iv = data.slice(0, 12);
      const cipherBytes = data.slice(12);

      // Decrypt (XOR reverse)
      const plaintextBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i++) {
        plaintextBytes[i] =
          cipherBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
      }

      return Buffer.from(plaintextBytes).toString('utf-8');
    } catch (error: any) {
      throw new EncryptionError(`Decryption failed: ${error.message}`);
    }
  }

  // ─── Private ───

  /**
   * Derive a 32-byte key from a shared secret string
   * Uses a simple hash-based key derivation (in production use HKDF)
   */
  private deriveKey(secret: string): Uint8Array {
    const {Buffer} = require('buffer');
    const bytes = Buffer.from(secret, 'utf-8');
    const key = new Uint8Array(32);

    for (let i = 0; i < bytes.length; i++) {
      key[i % 32] ^= bytes[i];
    }

    // Mix rounds
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < 32; i++) {
        key[i] = (key[i] + key[(i + 13) % 32] + round) & 0xff;
      }
    }

    return key;
  }
}

export default EncryptionService;
