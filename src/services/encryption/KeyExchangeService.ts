// Key Exchange Service — ECDH key exchange for establishing shared secrets between BLE peers

import {ethers} from 'ethers';
import {EncryptionError} from '../../utils/errors';

interface PeerSession {
  peerPublicKey: string;
  sharedSecret: string;
  createdAt: number;
}

// Session expiry time (1 hour)
const SESSION_EXPIRY_MS = 3600000;

class KeyExchangeService {
  private static instance: KeyExchangeService;
  private ephemeralPrivateKey: string;
  private ephemeralPublicKey: string;
  private peerSessions: Map<string, PeerSession> = new Map();

  private constructor() {
    // Generate initial ephemeral key pair
    const wallet = ethers.Wallet.createRandom();
    this.ephemeralPrivateKey = wallet.privateKey;
    this.ephemeralPublicKey = wallet.signingKey.compressedPublicKey;
  }

  static getInstance(): KeyExchangeService {
    if (!KeyExchangeService.instance) {
      KeyExchangeService.instance = new KeyExchangeService();
    }
    return KeyExchangeService.instance;
  }

  /**
   * Generate a new ephemeral key pair (for forward secrecy)
   * Call this periodically or per-session to ensure forward secrecy
   */
  rotateKeys(): void {
    const wallet = ethers.Wallet.createRandom();
    this.ephemeralPrivateKey = wallet.privateKey;
    this.ephemeralPublicKey = wallet.signingKey.compressedPublicKey;

    // Clear existing sessions since keys changed
    this.peerSessions.clear();
  }

  /**
   * Get our public key to share with peers during handshake
   */
  getPublicKey(): string {
    return this.ephemeralPublicKey;
  }

  /**
   * Derive a shared secret with a peer using ECDH
   * Uses secp256k1 curve (same as Ethereum)
   */
  deriveSharedSecret(peerId: string, peerPublicKey: string): string {
    try {
      // Check for existing valid session
      const existingSession = this.peerSessions.get(peerId);
      if (
        existingSession &&
        existingSession.peerPublicKey === peerPublicKey &&
        Date.now() - existingSession.createdAt < SESSION_EXPIRY_MS
      ) {
        return existingSession.sharedSecret;
      }

      // Perform ECDH key agreement using ethers.js SigningKey
      const signingKey = new ethers.SigningKey(this.ephemeralPrivateKey);
      const sharedPoint = signingKey.computeSharedSecret(peerPublicKey);

      // Hash the shared point to get a 256-bit shared secret
      const sharedSecret = ethers.keccak256(sharedPoint);

      // Store session
      this.peerSessions.set(peerId, {
        peerPublicKey,
        sharedSecret,
        createdAt: Date.now(),
      });

      return sharedSecret;
    } catch (error: any) {
      throw new EncryptionError(
        `ECDH key exchange failed: ${error.message}`,
        'KEY_EXCHANGE_ERROR',
      );
    }
  }

  /**
   * Check if we have an active session with a peer
   */
  hasSession(peerId: string): boolean {
    const session = this.peerSessions.get(peerId);
    if (!session) return false;
    return Date.now() - session.createdAt < SESSION_EXPIRY_MS;
  }

  /**
   * Get the shared secret for an existing session
   */
  getSessionSecret(peerId: string): string | null {
    const session = this.peerSessions.get(peerId);
    if (!session) return null;
    if (Date.now() - session.createdAt >= SESSION_EXPIRY_MS) {
      this.peerSessions.delete(peerId);
      return null;
    }
    return session.sharedSecret;
  }

  /**
   * Remove a peer session (on disconnect)
   */
  removeSession(peerId: string): void {
    this.peerSessions.delete(peerId);
  }

  /**
   * Clear all sessions and generate new keys
   */
  reset(): void {
    this.peerSessions.clear();
    this.rotateKeys();
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [peerId, session] of this.peerSessions) {
      if (now - session.createdAt >= SESSION_EXPIRY_MS) {
        this.peerSessions.delete(peerId);
      }
    }
  }

  /**
   * Get number of active sessions
   */
  getActiveSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.peerSessions.size;
  }
}

export default KeyExchangeService;
