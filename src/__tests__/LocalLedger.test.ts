/**
 * LocalLedger tests use the real Redux store.
 * We use a unique token address per test group to avoid state bleed
 * between tests within the same file (store is a module-level singleton).
 */
import LocalLedger from '../services/ledger/LocalLedger';
import {store} from '../store';

// Reset the LocalLedger singleton (store state accumulates but we use unique tokens)
beforeEach(() => {
  (LocalLedger as any).instance = undefined;
});

// Helper — generates a unique fake token address per test to avoid balance bleed
let tokenCounter = 0;
function freshToken(): string {
  tokenCounter++;
  return `0xToken${tokenCounter.toString().padStart(38, '0')}`;
}

describe('LocalLedger', () => {
  // ─── Singleton ─────────────────────────────────────────────────

  it('getInstance returns the same instance', () => {
    const a = LocalLedger.getInstance();
    const b = LocalLedger.getInstance();
    expect(a).toBe(b);
  });

  // ─── credit ────────────────────────────────────────────────────

  it('credit increases the token balance', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-c1', '0xFrom', '0xTo', '50.00', token);
    expect(ledger.getBalance(token)).toBe('50.000000');
  });

  it('credit accumulates across multiple calls', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-ca', '0xA', '0xB', '10.00', token);
    ledger.credit('tx-cb', '0xA', '0xB', '20.00', token);
    expect(parseFloat(ledger.getBalance(token))).toBeCloseTo(30.0, 2);
  });

  it('credit adds an entry to the ledger history', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();
    const txId = 'tx-entry-check';

    ledger.credit(txId, '0xFrom', '0xTo', '15.00', token);

    const state = store.getState().ledger;
    const entry = state.entries.find(e => e.txId === txId);
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('CREDIT');
    expect(entry!.amount).toBe('15.00');
    expect(entry!.settled).toBe(false);
  });

  it('credit does not add duplicate entries for the same txId', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();
    const txId = 'tx-dedup';

    ledger.credit(txId, '0xFrom', '0xTo', '5.00', token);
    ledger.credit(txId, '0xFrom', '0xTo', '5.00', token); // duplicate

    const state = store.getState().ledger;
    const entries = state.entries.filter(e => e.txId === txId);
    expect(entries).toHaveLength(1);
  });

  // ─── debit ─────────────────────────────────────────────────────

  it('debit decreases the token balance', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-d-credit', '0xExt', '0xMe', '100.00', token);
    const ok = ledger.debit('tx-d-debit', '0xMe', '0xThem', '30.00', token);

    expect(ok).toBe(true);
    expect(parseFloat(ledger.getBalance(token))).toBeCloseTo(70.0, 2);
  });

  it('debit returns false when balance is insufficient', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-small-credit', '0xExt', '0xMe', '10.00', token);
    const ok = ledger.debit('tx-overspend', '0xMe', '0xThem', '50.00', token);

    expect(ok).toBe(false);
  });

  it('debit does not change balance on failure', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-fail-credit', '0xExt', '0xMe', '5.00', token);
    ledger.debit('tx-fail-debit', '0xMe', '0xThem', '100.00', token); // fails

    expect(parseFloat(ledger.getBalance(token))).toBeCloseTo(5.0, 2);
  });

  it('debit does not add a ledger entry on failure', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();
    const failTxId = 'tx-no-entry';

    ledger.debit(failTxId, '0xA', '0xB', '999.00', token); // no balance

    const state = store.getState().ledger;
    const entry = state.entries.find(e => e.txId === failTxId);
    expect(entry).toBeUndefined();
  });

  it('debit adds a DEBIT entry to ledger history on success', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();
    const txId = 'tx-debit-entry';

    ledger.credit('tx-debit-prefund', '0xExt', '0xMe', '50.00', token);
    ledger.debit(txId, '0xMe', '0xThem', '20.00', token);

    const state = store.getState().ledger;
    const entry = state.entries.find(e => e.txId === txId);
    expect(entry).toBeDefined();
    expect(entry!.type).toBe('DEBIT');
    expect(entry!.amount).toBe('20.00');
  });

  // ─── hasEnoughBalance ──────────────────────────────────────────

  it('hasEnoughBalance returns true when balance covers the amount', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-heb', '0xExt', '0xMe', '100.00', token);
    expect(ledger.hasEnoughBalance(token, '50.00')).toBe(true);
    expect(ledger.hasEnoughBalance(token, '100.00')).toBe(true); // exact
  });

  it('hasEnoughBalance returns false when balance is too low', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();

    ledger.credit('tx-heb2', '0xExt', '0xMe', '10.00', token);
    expect(ledger.hasEnoughBalance(token, '10.01')).toBe(false);
  });

  it('hasEnoughBalance returns false for zero balance', () => {
    const ledger = LocalLedger.getInstance();
    const token = freshToken();
    expect(ledger.hasEnoughBalance(token, '0.01')).toBe(false);
  });

  // ─── getBalance ────────────────────────────────────────────────

  it('getBalance returns "0" for unknown token', () => {
    const ledger = LocalLedger.getInstance();
    expect(ledger.getBalance('0xUnknownToken')).toBe('0');
  });

  // ─── Full send/receive flow ────────────────────────────────────

  it('models a complete payment: Alice sends to Bob, Bob receives', () => {
    const alice = LocalLedger.getInstance();
    const token = freshToken();

    // Fund Alice
    alice.credit('fund-alice', '0xFaucet', '0xAlice', '200.00', token);
    expect(parseFloat(alice.getBalance(token))).toBeCloseTo(200.0, 2);

    // Alice sends 75 to Bob
    const ok = alice.debit('alice-pay-bob', '0xAlice', '0xBob', '75.00', token);
    expect(ok).toBe(true);
    expect(parseFloat(alice.getBalance(token))).toBeCloseTo(125.0, 2);

    // Bob's ledger instance credits the receive
    alice.credit('bob-receives', '0xAlice', '0xBob', '75.00', token);
    // (Both alice and bob share the same store in this test environment,
    //  but in production each phone has its own store.)
  });
});
