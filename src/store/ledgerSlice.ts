// Ledger Redux Slice — Local offline balance tracking
// Persisted via redux-persist to survive app restarts

import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export interface LedgerEntry {
  txId: string;
  type: 'CREDIT' | 'DEBIT';
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  tokenSymbol: string;
  timestamp: number;
  signature: string;
  settled: boolean;
}

export interface LedgerState {
  // Balances per token address: { "0x2F25...": "1250.00" }
  balances: Record<string, string>;
  // Full transaction history (credits + debits)
  entries: LedgerEntry[];
  // IDs of transactions waiting for on-chain settlement
  pendingSettlement: string[];
}

const initialState: LedgerState = {
  balances: {},
  entries: [],
  pendingSettlement: [],
};

// ── Helpers ──────────────────────────────────────────────

function addBigDecimal(a: string, b: string): string {
  const result = parseFloat(a || '0') + parseFloat(b || '0');
  return result.toFixed(6);
}

function subtractBigDecimal(a: string, b: string): string {
  const result = parseFloat(a || '0') - parseFloat(b || '0');
  return Math.max(0, result).toFixed(6);
}

// ── Slice ────────────────────────────────────────────────

export const ledgerSlice = createSlice({
  name: 'ledger',
  initialState,
  reducers: {
    creditBalance: (
      state,
      action: PayloadAction<{tokenAddress: string; amount: string}>,
    ) => {
      const {tokenAddress, amount} = action.payload;
      const current = state.balances[tokenAddress] || '0';
      state.balances[tokenAddress] = addBigDecimal(current, amount);
    },

    debitBalance: (
      state,
      action: PayloadAction<{tokenAddress: string; amount: string}>,
    ) => {
      const {tokenAddress, amount} = action.payload;
      const current = state.balances[tokenAddress] || '0';
      state.balances[tokenAddress] = subtractBigDecimal(current, amount);
    },

    addLedgerEntry: (state, action: PayloadAction<LedgerEntry>) => {
      // Dedup check — don't add if txId already exists
      if (state.entries.some(e => e.txId === action.payload.txId)) return;
      state.entries.unshift(action.payload); // newest first
      // Track for settlement
      if (!action.payload.settled) {
        state.pendingSettlement.push(action.payload.txId);
      }
    },

    markSettled: (state, action: PayloadAction<string>) => {
      const entry = state.entries.find(e => e.txId === action.payload);
      if (entry) {
        entry.settled = true;
      }
      state.pendingSettlement = state.pendingSettlement.filter(
        id => id !== action.payload,
      );
    },

    setInitialBalance: (
      state,
      action: PayloadAction<{tokenAddress: string; amount: string}>,
    ) => {
      state.balances[action.payload.tokenAddress] = action.payload.amount;
    },

    clearLedger: () => initialState,
  },
});

export const {
  creditBalance,
  debitBalance,
  addLedgerEntry,
  markSettled,
  setInitialBalance,
  clearLedger,
} = ledgerSlice.actions;

// ── Selectors ────────────────────────────────────────────

export const selectBalance = (tokenAddress: string) => (state: {ledger: LedgerState}) =>
  state.ledger.balances[tokenAddress] || '0';

export const selectAllBalances = (state: {ledger: LedgerState}) =>
  state.ledger.balances;

export const selectLedgerEntries = (state: {ledger: LedgerState}) =>
  state.ledger.entries;

export const selectPendingSettlement = (state: {ledger: LedgerState}) =>
  state.ledger.pendingSettlement;

export const selectUnsettledEntries = (state: {ledger: LedgerState}) =>
  state.ledger.entries.filter(e => !e.settled);

export default ledgerSlice.reducer;
