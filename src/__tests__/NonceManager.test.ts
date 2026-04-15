import NonceManager from '../services/transaction/NonceManager';
import {DoubleSpendError} from '../utils/errors';

// Reset the singleton between every test case
beforeEach(() => {
  (NonceManager as any).instance = undefined;
});

describe('NonceManager', () => {
  // ─── getNextNonce ──────────────────────────────────────────────

  it('starts at nonce 1 for a fresh address', () => {
    const nm = NonceManager.getInstance();
    expect(nm.getNextNonce('0xABC')).toBe(1);
  });

  it('increments monotonically on each call', () => {
    const nm = NonceManager.getInstance();
    expect(nm.getNextNonce('0xABC')).toBe(1);
    expect(nm.getNextNonce('0xABC')).toBe(2);
    expect(nm.getNextNonce('0xABC')).toBe(3);
  });

  it('tracks nonces independently per address', () => {
    const nm = NonceManager.getInstance();
    nm.getNextNonce('0xAlice');
    nm.getNextNonce('0xAlice');
    nm.getNextNonce('0xBob');

    expect(nm.getCurrentNonce('0xAlice')).toBe(2);
    expect(nm.getCurrentNonce('0xBob')).toBe(1);
  });

  it('normalises address to lowercase', () => {
    const nm = NonceManager.getInstance();
    nm.getNextNonce('0xAbCdEf');
    // Mix of cases — all should map to the same counter
    expect(nm.getCurrentNonce('0xabcdef')).toBe(1);
    expect(nm.getCurrentNonce('0xABCDEF')).toBe(1);
  });

  // ─── getCurrentNonce ───────────────────────────────────────────

  it('getCurrentNonce returns 0 for unknown address', () => {
    const nm = NonceManager.getInstance();
    expect(nm.getCurrentNonce('0xUnknown')).toBe(0);
  });

  it('getCurrentNonce does not increment', () => {
    const nm = NonceManager.getInstance();
    nm.getNextNonce('0xX');
    expect(nm.getCurrentNonce('0xX')).toBe(1);
    expect(nm.getCurrentNonce('0xX')).toBe(1); // unchanged
  });

  // ─── setNonce ──────────────────────────────────────────────────

  it('setNonce overrides the stored nonce', () => {
    const nm = NonceManager.getInstance();
    nm.setNonce('0xAddr', 10);
    expect(nm.getCurrentNonce('0xAddr')).toBe(10);
    expect(nm.getNextNonce('0xAddr')).toBe(11);
  });

  // ─── syncFromChain ─────────────────────────────────────────────

  it('syncFromChain uses the higher of chain and local nonce', async () => {
    const nm = NonceManager.getInstance();
    nm.setNonce('0xSync', 3); // local is 3

    const mockProvider = {
      getTransactionCount: jest.fn().mockResolvedValue(7), // chain is 7
    };
    const result = await nm.syncFromChain('0xSync', mockProvider);
    expect(result).toBe(7);
    expect(nm.getCurrentNonce('0xSync')).toBe(7);
  });

  it('syncFromChain keeps local nonce when it is higher than chain', async () => {
    const nm = NonceManager.getInstance();
    nm.setNonce('0xSync', 15); // local > chain

    const mockProvider = {
      getTransactionCount: jest.fn().mockResolvedValue(3), // chain lagging
    };
    const result = await nm.syncFromChain('0xSync', mockProvider);
    expect(result).toBe(15); // local wins
  });

  it('syncFromChain returns local nonce when provider throws', async () => {
    const nm = NonceManager.getInstance();
    nm.setNonce('0xFail', 5);

    const mockProvider = {
      getTransactionCount: jest.fn().mockRejectedValue(new Error('network')),
    };
    const result = await nm.syncFromChain('0xFail', mockProvider);
    expect(result).toBe(5);
  });

  // ─── isDuplicate / markSeen ────────────────────────────────────

  it('isDuplicate returns false for unseen txId', () => {
    const nm = NonceManager.getInstance();
    expect(nm.isDuplicate('tx-001')).toBe(false);
  });

  it('isDuplicate returns true after markSeen', () => {
    const nm = NonceManager.getInstance();
    nm.markSeen('tx-duplicate');
    expect(nm.isDuplicate('tx-duplicate')).toBe(true);
  });

  it('markSeen does not affect other txIds', () => {
    const nm = NonceManager.getInstance();
    nm.markSeen('tx-A');
    expect(nm.isDuplicate('tx-B')).toBe(false);
  });

  it('prevents double-spend by catching duplicate txId', () => {
    const nm = NonceManager.getInstance();
    const txId = 'tx-spend-001';

    // First time: not a duplicate
    expect(nm.isDuplicate(txId)).toBe(false);
    nm.markSeen(txId);

    // Second time: duplicate detected
    expect(nm.isDuplicate(txId)).toBe(true);
  });

  // ─── Singleton ─────────────────────────────────────────────────

  it('getInstance always returns the same instance', () => {
    const a = NonceManager.getInstance();
    const b = NonceManager.getInstance();
    expect(a).toBe(b);
  });

  it('state is shared across getInstance calls', () => {
    const a = NonceManager.getInstance();
    a.getNextNonce('0xShared'); // nonce = 1
    const b = NonceManager.getInstance();
    expect(b.getCurrentNonce('0xShared')).toBe(1);
  });
});
