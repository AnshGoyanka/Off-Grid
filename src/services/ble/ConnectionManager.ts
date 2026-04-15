// Connection Manager — Manages BLE peer connections with auto-reconnect

import BleService from './BleService';
import {BleConnectionState, RECONNECT_MAX_RETRIES, RECONNECT_BASE_DELAY_MS, HEARTBEAT_INTERVAL_MS} from '../../types/ble';
import {BleConnectionError} from '../../utils/errors';

interface ConnectionEntry {
  deviceId: string;
  state: BleConnectionState;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  lastHeartbeat: number;
}

export type ConnectionStateCallback = (
  deviceId: string,
  state: BleConnectionState,
) => void;

class ConnectionManager {
  private static instance: ConnectionManager;
  private bleService: BleService;
  private connections: Map<string, ConnectionEntry> = new Map();
  private stateCallbacks: ConnectionStateCallback[] = [];

  private constructor() {
    this.bleService = BleService.getInstance();
  }

  static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Establish connection to a peer device with auto-reconnect
   */
  async connect(deviceId: string): Promise<void> {
    if (this.connections.has(deviceId)) {
      const entry = this.connections.get(deviceId)!;
      if (entry.state === BleConnectionState.CONNECTED) return;
    }

    this.updateConnectionState(deviceId, BleConnectionState.CONNECTING);

    try {
      await this.bleService.connectToDevice(deviceId);
      this.updateConnectionState(deviceId, BleConnectionState.CONNECTED);

      // Reset retry count on successful connect
      const entry = this.connections.get(deviceId);
      if (entry) entry.retryCount = 0;

      // Start heartbeat
      this.startHeartbeat(deviceId);
    } catch (error: any) {
      this.updateConnectionState(deviceId, BleConnectionState.DISCONNECTED);
      this.scheduleReconnect(deviceId);
    }
  }

  /**
   * Disconnect from a peer device
   */
  async disconnect(deviceId: string): Promise<void> {
    const entry = this.connections.get(deviceId);
    if (!entry) return;

    this.updateConnectionState(deviceId, BleConnectionState.DISCONNECTING);

    // Clear timers
    if (entry.retryTimer) clearTimeout(entry.retryTimer);
    if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer);

    await this.bleService.disconnectDevice(deviceId);
    this.connections.delete(deviceId);
    this.notifyStateChange(deviceId, BleConnectionState.DISCONNECTED);
  }

  /**
   * Send data to a connected device
   */
  async sendToDevice(deviceId: string, data: string): Promise<void> {
    const entry = this.connections.get(deviceId);
    if (!entry || entry.state !== BleConnectionState.CONNECTED) {
      throw new BleConnectionError(`Device ${deviceId} not connected`);
    }
    await this.bleService.sendData(deviceId, data);
  }

  /**
   * Broadcast data to all connected peers
   */
  async broadcastToAll(data: string, excludeId?: string): Promise<void> {
    const connectedIds = this.getConnectedDeviceIds();
    const targets = excludeId
      ? connectedIds.filter(id => id !== excludeId)
      : connectedIds;

    await Promise.allSettled(
      targets.map(id => this.sendToDevice(id, data)),
    );
  }

  /**
   * Register a connection state change callback
   */
  onConnectionStateChange(callback: ConnectionStateCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get all connected device IDs
   */
  getConnectedDeviceIds(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, entry]) => entry.state === BleConnectionState.CONNECTED)
      .map(([id]) => id);
  }

  /**
   * Get connection count
   */
  getConnectedCount(): number {
    return this.getConnectedDeviceIds().length;
  }

  /**
   * Disconnect all and clean up
   */
  async disconnectAll(): Promise<void> {
    const deviceIds = Array.from(this.connections.keys());
    await Promise.allSettled(deviceIds.map(id => this.disconnect(id)));
    this.connections.clear();
  }

  // ─── Private ───

  private updateConnectionState(
    deviceId: string,
    state: BleConnectionState,
  ): void {
    let entry = this.connections.get(deviceId);
    if (!entry) {
      entry = {
        deviceId,
        state,
        retryCount: 0,
        retryTimer: null,
        heartbeatTimer: null,
        lastHeartbeat: Date.now(),
      };
      this.connections.set(deviceId, entry);
    } else {
      entry.state = state;
    }
    this.notifyStateChange(deviceId, state);
  }

  private notifyStateChange(
    deviceId: string,
    state: BleConnectionState,
  ): void {
    this.stateCallbacks.forEach(cb => cb(deviceId, state));
  }

  private scheduleReconnect(deviceId: string): void {
    const entry = this.connections.get(deviceId);
    if (!entry) return;

    if (entry.retryCount >= RECONNECT_MAX_RETRIES) {
      console.warn(
        `[ConnectionManager] Max retries reached for ${deviceId}`,
      );
      this.connections.delete(deviceId);
      return;
    }

    // Exponential backoff
    const delay =
      RECONNECT_BASE_DELAY_MS * Math.pow(2, entry.retryCount);
    entry.retryCount++;

    entry.retryTimer = setTimeout(async () => {
      try {
        await this.connect(deviceId);
      } catch {
        // connect() handles its own retry scheduling
      }
    }, delay);
  }

  private startHeartbeat(deviceId: string): void {
    const entry = this.connections.get(deviceId);
    if (!entry) return;

    if (entry.heartbeatTimer) clearInterval(entry.heartbeatTimer);

    entry.heartbeatTimer = setInterval(async () => {
      if (!this.bleService.isDeviceConnected(deviceId)) {
        clearInterval(entry.heartbeatTimer!);
        this.updateConnectionState(
          deviceId,
          BleConnectionState.DISCONNECTED,
        );
        this.scheduleReconnect(deviceId);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }
}

export default ConnectionManager;
