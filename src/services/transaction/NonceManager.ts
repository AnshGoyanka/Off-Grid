// Nonce Manager — Local nonce tracking and double-spend prevention

import {STORAGE_NONCE} from '../../utils/constants';
import {DoubleSpendError} from '../../utils/errors';

class NonceManager {
  private static instance: NonceManager;
  private nonces: Map<string, number> = new Map();
  private seenTxIds: Set<string> = new Set();
  private maxSeenCache: number = 10000;

  private constructor() {}

  static getInstance(): NonceManager {
    if (!NonceManager.instance) {
      NonceManager.instance = new NonceManager();
    }
    return NonceManager.instance;
  }

  /**
   * Get the next nonce for an address
   */
  getNextNonce(address: string): number {
    const normalized = address.toLowerCase();
    const current = this.nonces.get(normalized) || 0;
    const next = current + 1;
    this.nonces.set(normalized, next);
    return next;
  }

  /**
   * Get the current nonce for an address (without incrementing)
   */
  getCurrentNonce(address: string): number {
    return this.nonces.get(address.toLowerCase()) || 0;
  }

  /**
   * Set the nonce for an address (e.g., after syncing from chain)
   */
  setNonce(address: string, nonce: number): void {
    this.nonces.set(address.toLowerCase(), nonce);
  }

  /**
   * Sync nonce from chain (when online)
   */
  async syncFromChain(
    address: string,
    provider: any,
  ): Promise<number> {
    try {
      const chainNonce = await provider.getTransactionCount(address);
      const localNonce = this.getCurrentNonce(address);
      const effectiveNonce = Math.max(chainNonce, localNonce);
      this.setNonce(address, effectiveNonce);
      return effectiveNonce;
    } catch {
      return this.getCurrentNonce(address);
    }
  }

  /**
   * Check if a transaction ID has been seen (duplicate detection)
   */
  isDuplicate(txId: string): boolean {
    return this.seenTxIds.has(txId);
  }

  /**
   * Mark a transaction ID as seen
   */
  markSeen(txId: string): void {
    this.seenTxIds.add(txId);

    // Trim cache
    if (this.seenTxIds.size > this.maxSeenCache) {
      const entries = Array.from(this.seenTxIds);
      const toRemove = entries.slice(0, entries.length - this.maxSeenCache);
      toRemove.forEach(id => this.seenTxIds.delete(id));
    }
  }

  /**
   * Get number of seen transactions
   */
  getSeenCount(): number {
    return this.seenTxIds.size;
  }

  /**
   * Clear all state
   */
  clear(): void {
    this.nonces.clear();
    this.seenTxIds.clear();
  }
}

export default NonceManager;
