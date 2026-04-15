/// <reference types="jest" />

import WalletService from '../services/wallet/WalletService';
import {WalletImportError} from '../utils/errors';
import * as Keychain from 'react-native-keychain';
import algosdk from 'algosdk';
import {fromBase64} from '../utils/helpers';

jest.mock('react-native-keychain');

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (WalletService as any).instance = undefined;
  });

  it('getInstance always returns the same instance', () => {
    const a = WalletService.getInstance();
    const b = WalletService.getInstance();
    expect(a).toBe(b);
  });

  it('createWallet returns a valid Algorand address', async () => {
    const svc = WalletService.getInstance();
    const result = await svc.createWallet();
    expect(algosdk.isValidAddress(result.address)).toBe(true);
  });

  it('createWallet returns a 25-word mnemonic', async () => {
    const svc = WalletService.getInstance();
    const result = await svc.createWallet();
    const wordCount = result.mnemonic.trim().split(/\s+/).length;
    expect(wordCount).toBe(25);
  });

  it('createWallet stores credentials in keychain', async () => {
    const svc = WalletService.getInstance();
    const result = await svc.createWallet();

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'private-key',
      result.privateKey,
      expect.any(Object),
    );
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'mnemonic',
      result.mnemonic,
      expect.any(Object),
    );
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'wallet-address',
      result.address,
      expect.any(Object),
    );
  });

  it('importWallet recovers the same address from exported mnemonic', async () => {
    const svc = WalletService.getInstance();
    const created = await svc.createWallet();

    (WalletService as any).instance = undefined;
    const svc2 = WalletService.getInstance();
    const imported = await svc2.importWallet(created.mnemonic);

    expect(imported.address).toBe(created.address);
  });

  it('importWallet throws WalletImportError on invalid mnemonic', async () => {
    const svc = WalletService.getInstance();
    await expect(svc.importWallet('invalid mnemonic words')).rejects.toBeInstanceOf(
      WalletImportError,
    );
  });

  it('loadWallet returns null when no wallet is stored', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(null);
    const svc = WalletService.getInstance();
    const address = await svc.loadWallet();
    expect(address).toBeNull();
  });

  it('getAddress throws if wallet is not loaded', () => {
    const svc = WalletService.getInstance();
    expect(() => svc.getAddress()).toThrow('Wallet not loaded');
  });

  it('signMessage produces verifiable Algorand signature', async () => {
    const svc = WalletService.getInstance();
    const created = await svc.createWallet();

    const message = 'offgrid transfer intent';
    const signatureB64 = await svc.signMessage(message);
    const ok = algosdk.verifyBytes(
      new Uint8Array(Buffer.from(message, 'utf8')),
      fromBase64(signatureB64),
      created.address,
    );

    expect(ok).toBe(true);
  });

  it('hasWallet returns true after createWallet', async () => {
    const svc = WalletService.getInstance();
    const created = await svc.createWallet();
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
      username: 'wallet-address',
      password: created.address,
    });
    expect(await svc.hasWallet()).toBe(true);
  });

  it('getMnemonic returns stored mnemonic', async () => {
    const svc = WalletService.getInstance();
    const created = await svc.createWallet();
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
      username: 'mnemonic',
      password: created.mnemonic,
    });
    const mnemonic = await svc.getMnemonic();
    expect(mnemonic).toBe(created.mnemonic);
  });
});
