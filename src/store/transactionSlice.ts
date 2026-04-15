// Transaction Redux Slice — Updated for 100% offline mesh

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
  Transaction,
  TransactionState,
  TransactionStatus,
  TransactionReceipt,
  INITIAL_TRANSACTION_STATE,
} from '../types/transaction';
import {MAX_SEEN_TX_CACHE} from '../utils/constants';

export const transactionSlice = createSlice({
  name: 'transactions',
  initialState: INITIAL_TRANSACTION_STATE,
  reducers: {
    addTransaction: (state, action: PayloadAction<Transaction>) => {
      const tx = action.payload;
      // Don't add duplicates
      if (state.seenTxIds.includes(tx.id)) return;

      state.seenTxIds.push(tx.id);
      if (state.seenTxIds.length > MAX_SEEN_TX_CACHE) {
        state.seenTxIds = state.seenTxIds.slice(-MAX_SEEN_TX_CACHE);
      }

      if (tx.status === TransactionStatus.FAILED) {
        state.failed.unshift(tx);
      } else if (
        tx.status === TransactionStatus.VERIFIED ||
        tx.status === TransactionStatus.RECEIPTED
      ) {
        state.verified.unshift(tx);
      } else if (tx.status === TransactionStatus.SETTLED) {
        state.settled.unshift(tx);
      } else {
        state.pending.unshift(tx);
      }
    },

    updateTransactionStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: TransactionStatus;
        txHash?: string;
        errorMessage?: string;
      }>,
    ) => {
      const {id, status, txHash, errorMessage} = action.payload;

      // Helper: find and remove from a list
      const findAndRemove = (list: Transaction[]): Transaction | null => {
        const idx = list.findIndex(tx => tx.id === id);
        if (idx === -1) return null;
        return list.splice(idx, 1)[0];
      };

      // Search all lists
      let tx =
        findAndRemove(state.pending) ??
        findAndRemove(state.verified) ??
        findAndRemove(state.settled) ??
        findAndRemove(state.failed);

      if (!tx) return;

      tx.status = status;
      if (txHash) tx.txHash = txHash;
      if (errorMessage) tx.errorMessage = errorMessage;

      // Place in correct list
      if (status === TransactionStatus.FAILED) {
        state.failed.unshift(tx);
      } else if (
        status === TransactionStatus.VERIFIED ||
        status === TransactionStatus.RECEIPTED
      ) {
        state.verified.unshift(tx);
      } else if (status === TransactionStatus.SETTLED) {
        state.settled.unshift(tx);
      } else {
        state.pending.unshift(tx);
      }
    },

    attachReceipt: (
      state,
      action: PayloadAction<{txId: string; receipt: TransactionReceipt}>,
    ) => {
      const {txId, receipt} = action.payload;
      const allLists = [state.pending, state.verified, state.settled];
      for (const list of allLists) {
        const tx = list.find(t => t.id === txId);
        if (tx) {
          tx.receipt = receipt;
          tx.status = TransactionStatus.RECEIPTED;
          break;
        }
      }
    },

    markTxSeen: (state, action: PayloadAction<string>) => {
      if (!state.seenTxIds.includes(action.payload)) {
        state.seenTxIds.push(action.payload);
      }
    },

    clearTransactions: () => INITIAL_TRANSACTION_STATE,
  },
});

export const {
  addTransaction,
  updateTransactionStatus,
  attachReceipt,
  markTxSeen,
  clearTransactions,
} = transactionSlice.actions;

// Selectors
export const selectPendingTxns = (state: {transactions: TransactionState}) =>
  state.transactions.pending;
export const selectVerifiedTxns = (state: {transactions: TransactionState}) =>
  state.transactions.verified;
export const selectSettledTxns = (state: {transactions: TransactionState}) =>
  state.transactions.settled;
export const selectFailedTxns = (state: {transactions: TransactionState}) =>
  state.transactions.failed;
export const selectRecentTxns = (state: {transactions: TransactionState}) =>
  [
    ...state.transactions.verified,
    ...state.transactions.pending,
    ...state.transactions.settled,
    ...state.transactions.failed,
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
export const selectIsTxSeen =
  (id: string) => (state: {transactions: TransactionState}) =>
    state.transactions.seenTxIds.includes(id);

export default transactionSlice.reducer;
