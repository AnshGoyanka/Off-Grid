// Transaction type definitions for Bitpay
// Adapted for 100% offline mesh — no on-chain interaction in the hot path

import {VectorClockMap} from '../services/ledger/VectorClock';

export enum TransactionStatus {
  CREATED = 'CREATED',       // Transfer intent created locally
  SIGNED = 'SIGNED',         // Signed with private key
  GOSSIPED = 'GOSSIPED',     // Sent over BLE mesh
  VERIFIED = 'VERIFIED',     // Receiver verified signature + vector clock
  RECEIPTED = 'RECEIPTED',   // Both parties have signed receipts
  SETTLED = 'SETTLED',       // Eventually submitted on-chain (when internet available)
  FAILED = 'FAILED',         // Verification or delivery failed
}

/**
 * TransferIntent — A signed, offline payment intent
 * This is what gets gossipped over BLE. No raw EVM transaction needed.
 */
export interface TransferIntent {
  id: string;                  // Unique transaction ID
  from: string;                // Sender wallet address
  to: string;                  // Receiver wallet address
  amount: string;              // Human-readable amount (e.g., "25.50")
  tokenAddress: string;        // ERC-20 token contract address
  tokenSymbol: string;         // e.g., "USDC" or "cUSD"
  nonce: number;               // Sender's local nonce (monotonically increasing)
  vectorClock: VectorClockMap; // Causal ordering clock
  timestamp: number;           // Unix timestamp (ms)
  signature: string;           // ECDSA signature of the intent payload
  ttl: number;                 // Hops remaining for gossip
}

/**
 * Transaction — Full transaction record stored locally
 * Extends TransferIntent with status tracking
 */
export interface Transaction extends TransferIntent {
  status: TransactionStatus;
  receipt?: TransactionReceipt;  // Bilateral receipt from receiver
  txHash?: string;               // On-chain hash (only after settlement)
  errorMessage?: string;
}

/**
 * TransactionReceipt — Signed acknowledgment from the receiver
 * Sent back to the sender over BLE after verification
 */
export interface TransactionReceipt {
  txId: string;
  receiverAddress: string;
  receiverSignature: string;   // Receiver signs { txId, from, to, amount }
  timestamp: number;
}

/**
 * Wire format for BLE transmission (compact)
 */
export interface SerializedTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  tokenSymbol: string;
  nonce: number;
  vectorClock: VectorClockMap;
  signature: string;
  timestamp: number;
  ttl: number;
}

export interface TransactionState {
  pending: Transaction[];     // In-flight (CREATED, SIGNED, GOSSIPED)
  verified: Transaction[];    // Verified locally (VERIFIED, RECEIPTED)
  settled: Transaction[];     // On-chain settled (SETTLED)
  failed: Transaction[];
  seenTxIds: string[];        // Dedup cache
}

export const INITIAL_TRANSACTION_STATE: TransactionState = {
  pending: [],
  verified: [],
  settled: [],
  failed: [],
  seenTxIds: [],
};
