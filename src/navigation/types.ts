// Navigation type definitions for Bitpay

export type RootStackParamList = {
  // Onboarding stack
  Welcome: undefined;
  CreateWallet: undefined;
  RecoveryPhrase: {mnemonic: string};
  VerifyPhrase: {mnemonic: string};
  WalletReady: {address: string};
  ImportWallet: undefined;

  // Main app (tab navigator)
  MainTabs: undefined;

  // Screens pushed from within tabs
  Send: undefined;
  Receive: undefined;
  Activity: undefined;
};

export type MainTabParamList = {
  Wallet: undefined;
  Contacts: undefined;
  MeshMap: undefined;
  Settings: undefined;
};

export type WalletStackParamList = {
  Dashboard: undefined;
  Send: undefined;
  Receive: undefined;
  Activity: undefined;
  TransactionDetail: {txId: string};
};
