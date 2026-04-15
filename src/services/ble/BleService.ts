// BLE Service — Core BLE abstraction layer
// Wraps react-native-ble-plx for device scanning, connecting, and data transfer

import {Buffer} from 'buffer';
import {BleManager, Device, Characteristic, State} from 'react-native-ble-plx';
import {BleDeviceInfo, BLE_SERVICE_UUID, BLE_TX_CHARACTERISTIC_UUID, BLE_RX_CHARACTERISTIC_UUID, SCAN_DURATION_MS, CONNECTION_TIMEOUT_MS} from '../../types/ble';
import {BleError as CustomBleError, BleConnectionError, BleScanError} from '../../utils/errors';
import {toBase64, fromBase64} from '../../utils/helpers';

export type DataReceivedCallback = (deviceId: string, data: string) => void;

class BleService {
  private static instance: BleService;
  private manager: BleManager;
  private connectedDevices: Map<string, Device> = new Map();
  private dataCallbacks: DataReceivedCallback[] = [];
  private isReady: boolean = false;

  private constructor() {
    this.manager = new BleManager();
  }

  static getInstance(): BleService {
    if (!BleService.instance) {
      BleService.instance = new BleService();
    }
    return BleService.instance;
  }

  /**
   * Initialize the BLE manager and check permissions
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const subscription = this.manager.onStateChange(state => {
        if (state === State.PoweredOn) {
          subscription.remove();
          this.isReady = true;
          resolve();
        } else if (state === State.Unauthorized || state === State.Unsupported) {
          subscription.remove();
          reject(new CustomBleError(`BLE not available: ${state}`, 'BLE_UNAVAILABLE'));
        }
      }, true);
    });
  }

  /**
   * Start scanning for nearby devices with our service UUID
   */
  async startScan(
    onDeviceFound: (device: BleDeviceInfo) => void,
    durationMs: number = SCAN_DURATION_MS,
  ): Promise<void> {
    if (!this.isReady) {
      throw new BleScanError('BLE not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve();
      }, durationMs);

      this.manager.startDeviceScan(
        [BLE_SERVICE_UUID],
        {allowDuplicates: false},
        (error, device) => {
          if (error) {
            clearTimeout(timeout);
            reject(new BleScanError(error.message));
            return;
          }

          if (device) {
            onDeviceFound({
              id: device.id,
              name: device.name,
              rssi: device.rssi,
              serviceUUIDs: device.serviceUUIDs || [],
            });
          }
        },
      );
    });
  }

  /**
   * Stop scanning
   */
  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  /**
   * Connect to a specific device
   */
  async connectToDevice(deviceId: string): Promise<Device> {
    if (!this.isReady) {
      throw new BleConnectionError('BLE not initialized');
    }

    try {
      const device = await this.manager.connectToDevice(deviceId, {
        timeout: CONNECTION_TIMEOUT_MS,
      });

      const connectedDevice =
        await device.discoverAllServicesAndCharacteristics();

      this.connectedDevices.set(deviceId, connectedDevice);

      // Set up data receiving listener
      this.setupDataListener(connectedDevice);

      // Monitor disconnection
      this.manager.onDeviceDisconnected(deviceId, (error, disc) => {
        this.connectedDevices.delete(deviceId);
      });

      return connectedDevice;
    } catch (error: any) {
      throw new BleConnectionError(
        `Failed to connect to ${deviceId}: ${error.message}`,
      );
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      await this.manager.cancelDeviceConnection(deviceId);
      this.connectedDevices.delete(deviceId);
    } catch (error: any) {
      // Ignore errors during disconnect
    }
  }

  /**
   * Send data to a connected device
   */
  async sendData(deviceId: string, data: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new BleConnectionError(`Device ${deviceId} not connected`);
    }

    try {
      const base64Data = Buffer.from(data, 'utf-8').toString('base64');
      await device.writeCharacteristicWithResponseForService(
        BLE_SERVICE_UUID,
        BLE_TX_CHARACTERISTIC_UUID,
        base64Data,
      );
    } catch (error: any) {
      throw new CustomBleError(
        `Failed to send data to ${deviceId}: ${error.message}`,
        'BLE_SEND_ERROR',
      );
    }
  }

  /**
   * Register a callback for received data
   */
  onDataReceived(callback: DataReceivedCallback): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get list of connected device IDs
   */
  getConnectedDeviceIds(): string[] {
    return Array.from(this.connectedDevices.keys());
  }

  /**
   * Check if a device is connected
   */
  isDeviceConnected(deviceId: string): boolean {
    return this.connectedDevices.has(deviceId);
  }

  /**
   * Destroy the BLE manager (cleanup)
   */
  destroy(): void {
    this.connectedDevices.forEach((_, id) => {
      this.manager.cancelDeviceConnection(id).catch(() => {});
    });
    this.connectedDevices.clear();
    this.dataCallbacks = [];
    this.manager.destroy();
    this.isReady = false;
  }

  // ─── Private ───

  private setupDataListener(device: Device): void {
    device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      BLE_RX_CHARACTERISTIC_UUID,
      (error, characteristic) => {
        if (error) {
          console.warn('[BLE] Data monitor error:', error.message);
          return;
        }

        if (characteristic?.value) {
          const data = Buffer.from(characteristic.value, 'base64').toString(
            'utf-8',
          );
          this.dataCallbacks.forEach(cb => cb(device.id, data));
        }
      },
    );
  }
}

export default BleService;
