// LocalLedger — Offline balance tracking and transaction history
// This is the "source of truth" when there is no blockchain to query.
// Balances are modified by signed transfer intents verified over BLE.
// Eventually settled on-chain when internet becomes available.

import {store} from '../../store';
import {
  creditBalance,
  debitBalance,
  addLedgerEntry,
  LedgerEntry,
} from '../../store/ledgerSlice';
import {DEFAULT_TOKEN_ADDRESS, DEFAULT_TOKEN_SYMBOL} from '../../utils/constants';

export interface TransferRecord {
  txId: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  tokenSymbol: string;
  timestamp: number;
  signature: string;
  settled: boolean;        // true when submitted on-chain
}

class LocalLedger {
  private static instance: LocalLedger;

  private constructor() {}

  static getInstance(): LocalLedger {
    if (!LocalLedger.instance) {
      LocalLedger.instance = new LocalLedger();
    }
    return LocalLedger.instance;
  }

  /**
   * Credit an amount to the local balance (called on receive)
   */
  credit(
    txId: string,
    from: string,
    to: string,
    amount: string,
    tokenAddress: string = DEFAULT_TOKEN_ADDRESS,
    tokenSymbol: string = DEFAULT_TOKEN_SYMBOL,
    signature: string = '',
  ): void {
    // Update balance
    store.dispatch(
      creditBalance({tokenAddress, amount}),
    );

    // Record in history
    const entry: LedgerEntry = {
      txId,
      type: 'CREDIT',
      from,
      to,
      amount,
      tokenAddress,
      tokenSymbol,
      timestamp: Date.now(),
      signature,
      settled: false,
    };
    store.dispatch(addLedgerEntry(entry));
  }

  /**
   * Debit an amount from the local balance (called on send)
   * Returns false if insufficient balance
   */
  debit(
    txId: string,
    from: string,
    to: string,
    amount: string,
    tokenAddress: string = DEFAULT_TOKEN_ADDRESS,
    tokenSymbol: string = DEFAULT_TOKEN_SYMBOL,
    signature: string = '',
  ): boolean {
    // Check balance first
    if (!this.hasEnoughBalance(tokenAddress, amount)) {
      return false;
    }

    // Update balance
    store.dispatch(
      debitBalance({tokenAddress, amount}),
    );

    // Record in history
    const entry: LedgerEntry = {
      txId,
      type: 'DEBIT',
      from,
      to,
      amount,
      tokenAddress,
      tokenSymbol,
      timestamp: Date.now(),
      signature,
      settled: false,
    };
    store.dispatch(addLedgerEntry(entry));
    return true;
  }

  /**
   * Check if there is enough local balance for a transfer
   */
  hasEnoughBalance(
    tokenAddress: string = DEFAULT_TOKEN_ADDRESS,
    amount: string,
  ): boolean {
    const balance = this.getBalance(tokenAddress);
    return parseFloat(balance) >= parseFloat(amount);
  }

  /**
   * Get the local balance for a token
   */
  getBalance(tokenAddress: string = DEFAULT_TOKEN_ADDRESS): string {
    const balances = store.getState().ledger.balances;
    return balances[tokenAddress] || '0';
  }

  /**
   * Get all ledger entries (for activity screen)
   */
  getHistory(): LedgerEntry[] {
    return store.getState().ledger.entries;
  }

  /**
   * Get unsettled entries (for eventual on-chain settlement)
   */
  getUnsettled(): LedgerEntry[] {
    return store.getState().ledger.entries.filter(e => !e.settled);
  }

  /**
   * Check if a transaction has already been recorded (dedup)
   */
  hasTransaction(txId: string): boolean {
    return store.getState().ledger.entries.some(e => e.txId === txId);
  }
}

export default LocalLedger;
