// BLE type definitions for Bitpay

export enum BleConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTING = 'DISCONNECTING',
}

export interface BleChunk {
  messageId: string;
  sequenceNumber: number;
  totalChunks: number;
  payload: string; // base64 encoded
}

export interface BleDeviceInfo {
  id: string;
  name: string | null;
  rssi: number | null;
  serviceUUIDs: string[];
}

// BLE Service and Characteristic UUIDs for Bitpay
export const BLE_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const BLE_RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// BLE constraints
export const DEFAULT_MTU = 512;
export const MIN_MTU = 20;
export const CHUNK_HEADER_SIZE = 12; // messageId(4) + seq(4) + total(4)
export const SCAN_DURATION_MS = 10000;
export const CONNECTION_TIMEOUT_MS = 10000;
export const HEARTBEAT_INTERVAL_MS = 15000;
export const PEER_TIMEOUT_MS = 45000;
export const RECONNECT_MAX_RETRIES = 5;
export const RECONNECT_BASE_DELAY_MS = 1000;
