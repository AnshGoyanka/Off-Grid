// Wallet Redux Slice

import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {WalletState, INITIAL_WALLET_STATE} from '../types/wallet';

export const walletSlice = createSlice({
  name: 'wallet',
  initialState: INITIAL_WALLET_STATE,
  reducers: {
    setWallet: (
      state,
      action: PayloadAction<{address: string; balance?: string}>,
    ) => {
      state.address = action.payload.address;
      state.balance = action.payload.balance || '0.00';
      state.isSetup = true;
      state.isLoading = false;
      state.error = null;
    },
    updateBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload;
    },
    setMnemonicBackedUp: (state) => {
      state.mnemonicBackedUp = true;
    },
    setWalletLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setWalletError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    resetWallet: () => INITIAL_WALLET_STATE,
  },
});

export const {
  setWallet,
  updateBalance,
  setMnemonicBackedUp,
  setWalletLoading,
  setWalletError,
  resetWallet,
} = walletSlice.actions;

// Selectors
export const selectWalletAddress = (state: {wallet: WalletState}) =>
  state.wallet.address;
export const selectWalletBalance = (state: {wallet: WalletState}) =>
  state.wallet.balance;
export const selectIsWalletSetup = (state: {wallet: WalletState}) =>
  state.wallet.isSetup;
export const selectWalletLoading = (state: {wallet: WalletState}) =>
  state.wallet.isLoading;

export default walletSlice.reducer;
