// Mesh network type definitions for Bitpay
// 100% offline — all peers are equal, no relayer concept

import {VectorClockMap} from '../services/ledger/VectorClock';

export enum PeerRole {
  PEER = 'PEER',             // Default — all nodes are equal in offline mesh
  GATEWAY = 'GATEWAY',       // Optional — device that CAN settle on-chain (when internet available later)
}

export enum MeshMessageType {
  TRANSACTION = 'TRANSACTION',         // Signed transfer intent
  RECEIPT = 'RECEIPT',                 // Bilateral signed receipt
  DISCOVERY = 'DISCOVERY',            // Peer discovery
  HEARTBEAT = 'HEARTBEAT',            // Keep-alive
  KEY_EXCHANGE = 'KEY_EXCHANGE',       // ECDH key exchange
  BALANCE_SYNC = 'BALANCE_SYNC',      // Sync local ledger state between peers
}

export interface Peer {
  id: string;
  deviceId: string;
  address: string;             // Wallet address (set after key exchange)
  name: string;                // Display name
  rssi: number;                // BLE signal strength
  role: PeerRole;
  batteryLevel: number;
  lastSeen: number;
  isConnected: boolean;
}

export interface MeshMessage {
  messageId: string;
  type: MeshMessageType;
  payload: string;
  senderId: string;
  originId: string;
  timestamp: number;
  ttl: number;
  hopCount: number;
  vectorClock?: VectorClockMap;  // For causal ordering
}

export interface MeshState {
  peers: Peer[];
  isScanning: boolean;
  isAdvertising: boolean;
  connectedCount: number;
  selfId: string;
  isInitialized: boolean;
}

export const INITIAL_MESH_STATE: MeshState = {
  peers: [],
  isScanning: false,
  isAdvertising: false,
  connectedCount: 0,
  selfId: '',
  isInitialized: false,
};
