// Constants for Bitpay

// ─── Algorand TestNet Configuration ───
export const DEFAULT_CHAIN_ID = 416002; // Algorand TestNet identifier used in app metadata
export const DEFAULT_RPC_URL = 'https://testnet-api.algonode.cloud';
export const CHAIN_NAME = 'Algorand TestNet';
export const BLOCK_EXPLORER_URL = 'https://lora.algokit.io/testnet';
export const FAUCET_URL = 'https://bank.testnet.algorand.network/';

// ─── Token Configuration ───
// Native ALGO payments for hackathon MVP.
export const USDC_TOKEN_ADDRESS = 'ALGO';
export const USDC_TOKEN_SYMBOL = 'ALGO';
export const USDC_TOKEN_DECIMALS = 6;

// Optional second token slot in app config (same as ALGO for MVP)
export const CUSD_TOKEN_ADDRESS = 'ALGO';
export const CUSD_TOKEN_SYMBOL = 'ALGO';
export const CUSD_TOKEN_DECIMALS = 6;

// Default token for the app
export const DEFAULT_TOKEN_ADDRESS = USDC_TOKEN_ADDRESS;
export const DEFAULT_TOKEN_SYMBOL = USDC_TOKEN_SYMBOL;
export const DEFAULT_TOKEN_DECIMALS = USDC_TOKEN_DECIMALS;

// Algorand transaction fee (microALGO)
export const ALGOD_MIN_FEE = 1000;

// ─── Gossip Protocol ───
export const DEFAULT_TTL = 7;            // max hops before message dies
export const MAX_SEEN_TX_CACHE = 1000;   // max entries in dedup cache
export const GOSSIP_RATE_LIMIT_MS = 100; // min time between forwards

// ─── Mesh Networking ───
export const MAX_PEERS = 10;
export const MIN_RSSI_THRESHOLD = -80;   // dBm, reject weaker signals
export const BATTERY_LOW_THRESHOLD = 20; // percent

// ─── Backend Service ───
// Development: Android emulator → host machine on 10.0.2.2; iOS sim → localhost
// Change to your server's LAN address for real-device testing.
export const BACKEND_BASE_URL = 'http://10.0.2.2:3000';

// ─── Storage Keys ───
export const KEYCHAIN_SERVICE = 'bitpay-wallet';
export const KEYCHAIN_PRIVATE_KEY = 'private-key';
export const KEYCHAIN_MNEMONIC = 'mnemonic';
export const STORAGE_WALLET_ADDRESS = 'wallet-address';
export const STORAGE_NONCE = 'local-nonce';
