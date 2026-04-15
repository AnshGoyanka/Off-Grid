// Wallet Service — Algorand wallet creation, import, and signing

import algosdk from 'algosdk';
import {WalletCreationResult, WalletImportResult} from '../../types/wallet';
import {WalletCreationError, WalletImportError} from '../../utils/errors';
import SecureStorageService from './SecureStorageService';
import {fromBase64, toBase64} from '../../utils/helpers';

class WalletService {
  private static instance: WalletService;
  private secureStorage: SecureStorageService;
  private account: algosdk.Account | null = null;
  private accountAddress: string | null = null;

  private constructor() {
    this.secureStorage = SecureStorageService.getInstance();
  }

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Create a new Algorand wallet
   */
  async createWallet(): Promise<WalletCreationResult> {
    try {
      const account = algosdk.generateAccount();
      const mnemonic = algosdk.secretKeyToMnemonic(account.sk);
      this.account = account;
      const secretKeyBase64 = toBase64(account.sk);
      this.accountAddress = account.addr.toString();

      // Store securely
      await this.secureStorage.storePrivateKey(secretKeyBase64);
      await this.secureStorage.storeMnemonic(mnemonic);
      await this.secureStorage.storeAddress(account.addr.toString());

      return {
        address: account.addr.toString(),
        mnemonic,
        privateKey: secretKeyBase64,
      };
    } catch (error: any) {
      throw new WalletCreationError(
        `Failed to create wallet: ${error.message}`,
      );
    }
  }

  /**
   * Import wallet from mnemonic phrase
   */
  async importWallet(mnemonic: string, _accountIndex: number = 0): Promise<WalletImportResult> {
    try {
      const trimmedMnemonic = mnemonic.trim();
      const account = algosdk.mnemonicToSecretKey(trimmedMnemonic);
      this.account = account;
      this.accountAddress = account.addr.toString();
      const secretKeyBase64 = toBase64(account.sk);

      // Store securely
      await this.secureStorage.storePrivateKey(secretKeyBase64);
      await this.secureStorage.storeMnemonic(trimmedMnemonic);
      await this.secureStorage.storeAddress(account.addr.toString());

      return {
        address: account.addr.toString(),
        privateKey: secretKeyBase64,
      };
    } catch (error: any) {
      if (error instanceof WalletImportError) throw error;
      throw new WalletImportError(
        `Failed to import wallet: ${error.message}`,
      );
    }
  }

  /**
   * Load existing wallet from secure storage
   */
  async loadWallet(): Promise<string | null> {
    try {
      const mnemonic = await this.secureStorage.getMnemonic();
      if (mnemonic) {
        this.account = algosdk.mnemonicToSecretKey(mnemonic.trim());
        this.accountAddress = this.account.addr.toString();
        return this.accountAddress;
      }

      const privateKey = await this.secureStorage.getPrivateKey();
      if (!privateKey) return null;
      const sk = fromBase64(privateKey);
      const encodedAddress = algosdk.encodeAddress(sk.slice(32));
      this.account = {addr: encodedAddress as any, sk} as any;
      this.accountAddress = encodedAddress;
      return encodedAddress;
    } catch {
      return null;
    }
  }

  /**
   * Get the wallet address
   */
  getAddress(): string {
    if (!this.accountAddress) throw new Error('Wallet not loaded');
    return this.accountAddress;
  }

  /**
   * Sign arbitrary data (used for offline intent signatures)
   */
  async signMessage(message: string): Promise<string> {
    if (!this.account) throw new Error('Wallet not loaded');
    const data = new Uint8Array(Buffer.from(message, 'utf8'));
    const signed = algosdk.signBytes(data, this.account.sk);
    return toBase64(signed);
  }

  /**
   * Get the mnemonic (for backup display)
   */
  async getMnemonic(): Promise<string | null> {
    return await this.secureStorage.getMnemonic();
  }

  /**
   * Check if wallet exists in storage
   */
  async hasWallet(): Promise<boolean> {
    const address = await this.secureStorage.getAddress();
    return !!address;
  }

  /**
   * Clear wallet data (dangerous!)
   */
  async clearWallet(): Promise<void> {
    this.account = null;
    this.accountAddress = null;
    await this.secureStorage.clearAll();
  }
}

export default WalletService;
