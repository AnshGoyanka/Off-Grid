// Wallet type definitions for Bitpay

export interface WalletState {
  address: string;
  balance: string;
  isSetup: boolean;
  isLoading: boolean;
  mnemonicBackedUp: boolean;
  error: string | null;
}

export interface WalletCreationResult {
  address: string;
  mnemonic: string;
  privateKey: string;
}

export interface WalletImportResult {
  address: string;
  privateKey: string;
}

export const INITIAL_WALLET_STATE: WalletState = {
  address: '',
  balance: '0.00',
  isSetup: false,
  isLoading: false,
  mnemonicBackedUp: false,
  error: null,
};
