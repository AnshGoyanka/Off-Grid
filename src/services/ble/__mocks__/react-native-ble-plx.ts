// Mock for react-native-ble-plx — used by BleService in tests

export enum State {
  Unknown = 'Unknown',
  Resetting = 'Resetting',
  Unsupported = 'Unsupported',
  Unauthorized = 'Unauthorized',
  PoweredOff = 'PoweredOff',
  PoweredOn = 'PoweredOn',
}

export class Device {
  id = 'mock-device-id';
  name: string | null = 'Mock BLE Device';
  rssi: number | null = -60;
  serviceUUIDs: string[] = [];

  connect = jest.fn().mockResolvedValue(this);
  discoverAllServicesAndCharacteristics = jest.fn().mockResolvedValue(this);
  services = jest.fn().mockResolvedValue([]);
  characteristicsForService = jest.fn().mockResolvedValue([]);
  monitorCharacteristicForService = jest.fn().mockReturnValue({remove: jest.fn()});
  writeCharacteristicWithResponse = jest.fn().mockResolvedValue({});
  cancelConnection = jest.fn().mockResolvedValue(this);
}

export class Characteristic {
  uuid = 'mock-characteristic-uuid';
  value: string | null = null;
  monitor = jest.fn().mockReturnValue({remove: jest.fn()});
  writeWithResponse = jest.fn().mockResolvedValue(this);
}

export class BleManager {
  onStateChange = jest.fn(
    (_callback: (state: State) => void, _emitCurrent?: boolean) => ({
      remove: jest.fn(),
    }),
  );
  startDeviceScan = jest.fn();
  stopDeviceScan = jest.fn();
  connectToDevice = jest.fn().mockResolvedValue(new Device());
  cancelDeviceConnection = jest.fn().mockResolvedValue(null);
  readCharacteristicForDevice = jest
    .fn()
    .mockResolvedValue(new Characteristic());
  destroy = jest.fn();
}

export class BleError extends Error {
  errorCode: number;
  constructor(message: string, errorCode: number = 0) {
    super(message);
    this.errorCode = errorCode;
  }
}
