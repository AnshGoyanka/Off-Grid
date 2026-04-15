// Device Discovery Service — Continuous BLE scanning with peer management

import BleService from './BleService';
import {BleDeviceInfo, SCAN_DURATION_MS, PEER_TIMEOUT_MS} from '../../types/ble';
import {MIN_RSSI_THRESHOLD} from '../../utils/constants';
import {Peer, PeerRole} from '../../types/mesh';
import {generateMessageId} from '../../utils/helpers';

export type PeerDiscoveredCallback = (peer: Peer) => void;
export type PeerLostCallback = (deviceId: string) => void;

class DeviceDiscoveryService {
  private static instance: DeviceDiscoveryService;
  private bleService: BleService;
  private discoveredDevices: Map<string, BleDeviceInfo> = new Map();
  private lastSeenTimes: Map<string, number> = new Map();
  private discoveredCallbacks: PeerDiscoveredCallback[] = [];
  private lostCallbacks: PeerLostCallback[] = [];
  private scanInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private isScanning: boolean = false;

  private constructor() {
    this.bleService = BleService.getInstance();
  }

  static getInstance(): DeviceDiscoveryService {
    if (!DeviceDiscoveryService.instance) {
      DeviceDiscoveryService.instance = new DeviceDiscoveryService();
    }
    return DeviceDiscoveryService.instance;
  }

  /**
   * Start continuous discovery — scans, pauses, and rescans
   */
  async startContinuousDiscovery(): Promise<void> {
    if (this.isScanning) return;
    this.isScanning = true;

    // Perform initial scan
    await this.performScan();

    // Set up recurring scan
    this.scanInterval = setInterval(async () => {
      await this.performScan();
    }, SCAN_DURATION_MS + 2000); // scan + 2s pause

    // Set up stale peer cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePeers();
    }, PEER_TIMEOUT_MS / 2);
  }

  /**
   * Stop continuous discovery
   */
  stopDiscovery(): void {
    this.isScanning = false;
    this.bleService.stopScan();
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Register callback for newly discovered peers
   */
  onPeerDiscovered(callback: PeerDiscoveredCallback): () => void {
    this.discoveredCallbacks.push(callback);
    return () => {
      this.discoveredCallbacks = this.discoveredCallbacks.filter(
        cb => cb !== callback,
      );
    };
  }

  /**
   * Register callback for lost peers
   */
  onPeerLost(callback: PeerLostCallback): () => void {
    this.lostCallbacks.push(callback);
    return () => {
      this.lostCallbacks = this.lostCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get currently discovered devices
   */
  getDiscoveredDevices(): BleDeviceInfo[] {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Destroy and release resources
   */
  destroy(): void {
    this.stopDiscovery();
    this.discoveredDevices.clear();
    this.lastSeenTimes.clear();
    this.discoveredCallbacks = [];
    this.lostCallbacks = [];
  }

  // ─── Private ───

  private async performScan(): Promise<void> {
    try {
      await this.bleService.startScan(
        (device: BleDeviceInfo) => {
          // Filter by RSSI
          if (device.rssi !== null && device.rssi < MIN_RSSI_THRESHOLD) {
            return;
          }

          this.discoveredDevices.set(device.id, device);
          this.lastSeenTimes.set(device.id, Date.now());

          const peer: Peer = {
            id: generateMessageId(),
            deviceId: device.id,
            address: '', // Will be populated via handshake
            name: device.name || `Device-${device.id.slice(-4)}`,
            rssi: device.rssi || -100,
            role: PeerRole.PEER,
            batteryLevel: 100,
            lastSeen: Date.now(),
            isConnected: false,
          };

          // Notify whether new or updated
          this.discoveredCallbacks.forEach(cb => cb(peer));
        },
        SCAN_DURATION_MS,
      );
    } catch (error: any) {
      console.warn('[Discovery] Scan error:', error.message);
    }
  }

  private cleanupStalePeers(): void {
    const now = Date.now();
    for (const [id, lastSeen] of this.lastSeenTimes) {
      if (now - lastSeen > PEER_TIMEOUT_MS) {
        this.discoveredDevices.delete(id);
        this.lastSeenTimes.delete(id);
        this.lostCallbacks.forEach(cb => cb(id));
      }
    }
  }
}

export default DeviceDiscoveryService;
