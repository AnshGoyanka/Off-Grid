// Secure Storage Service — Wraps react-native-keychain for secure key storage

import * as Keychain from 'react-native-keychain';
import {
  KEYCHAIN_SERVICE,
  KEYCHAIN_PRIVATE_KEY,
  KEYCHAIN_MNEMONIC,
  STORAGE_WALLET_ADDRESS,
} from '../../utils/constants';

class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  /**
   * Store private key securely
   */
  async storePrivateKey(privateKey: string): Promise<void> {
    await Keychain.setGenericPassword(KEYCHAIN_PRIVATE_KEY, privateKey, {
      service: `${KEYCHAIN_SERVICE}-pk`,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  /**
   * Retrieve private key
   */
  async getPrivateKey(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${KEYCHAIN_SERVICE}-pk`,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Store mnemonic phrase securely
   */
  async storeMnemonic(mnemonic: string): Promise<void> {
    await Keychain.setGenericPassword(KEYCHAIN_MNEMONIC, mnemonic, {
      service: `${KEYCHAIN_SERVICE}-mnemonic`,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  /**
   * Retrieve mnemonic phrase
   */
  async getMnemonic(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${KEYCHAIN_SERVICE}-mnemonic`,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Store wallet address (non-sensitive, but convenient)
   */
  async storeAddress(address: string): Promise<void> {
    await Keychain.setGenericPassword(STORAGE_WALLET_ADDRESS, address, {
      service: `${KEYCHAIN_SERVICE}-address`,
    });
  }

  /**
   * Retrieve wallet address
   */
  async getAddress(): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `${KEYCHAIN_SERVICE}-address`,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear all stored data
   */
  async clearAll(): Promise<void> {
    await Keychain.resetGenericPassword({service: `${KEYCHAIN_SERVICE}-pk`});
    await Keychain.resetGenericPassword({
      service: `${KEYCHAIN_SERVICE}-mnemonic`,
    });
    await Keychain.resetGenericPassword({
      service: `${KEYCHAIN_SERVICE}-address`,
    });
  }
}

export default SecureStorageService;
