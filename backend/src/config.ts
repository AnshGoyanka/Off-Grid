// backend/src/config.ts — Centralised config from environment variables

import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  algorand: {
    algodUrl: optional('ALGORAND_ALGOD_URL', 'https://testnet-api.algonode.cloud'),
    algodToken: optional('ALGORAND_ALGOD_TOKEN', ''),
    indexerUrl: optional('ALGORAND_INDEXER_URL', 'https://testnet-idx.algonode.cloud'),
    indexerToken: optional('ALGORAND_INDEXER_TOKEN', ''),
    network: optional('ALGORAND_NETWORK', 'Algorand TestNet'),
  },

  settlement: {
    senderMnemonic: optional('ALGORAND_SETTLER_MNEMONIC', ''),
    defaultFeeMicroAlgo: parseInt(optional('ALGORAND_DEFAULT_FEE', '1000'), 10),
  },

  faucet: {
    mnemonic: optional('ALGORAND_FAUCET_MNEMONIC', ''),
    amountMicroAlgo: parseInt(optional('ALGORAND_FAUCET_AMOUNT', '1000000'), 10),
    externalUrl: optional('ALGORAND_FAUCET_URL', 'https://bank.testnet.algorand.network/'),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
    maxGeneral: parseInt(optional('RATE_LIMIT_MAX_GENERAL', '200'), 10),
    maxFaucet: parseInt(optional('RATE_LIMIT_MAX_FAUCET', '5'), 10),
  },

  corsOrigins: optional('CORS_ORIGINS', '*'),
} as const;
