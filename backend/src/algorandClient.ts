import algosdk, {Algodv2, Indexer} from 'algosdk';
import {config} from './config';

let _algod: Algodv2 | null = null;
let _indexer: Indexer | null = null;

export function getAlgodClient(): Algodv2 {
  if (!_algod) {
    _algod = new algosdk.Algodv2(
      config.algorand.algodToken,
      config.algorand.algodUrl,
      '',
    );
  }
  return _algod;
}

export function getIndexerClient(): Indexer {
  if (!_indexer) {
    _indexer = new algosdk.Indexer(
      config.algorand.indexerToken,
      config.algorand.indexerUrl,
      '',
    );
  }
  return _indexer;
}

export function isValidAddress(address: string): boolean {
  try {
    return algosdk.isValidAddress(address);
  } catch {
    return false;
  }
}

export function isValidTxHash(hash: string): boolean {
  return /^[A-Z2-7]{52}$/.test(hash);
}

export function isValidSignedTx(signedTx: string): boolean {
  if (typeof signedTx !== 'string') return false;
  if (signedTx.length < 16 || signedTx.length > 16384) return false;
  return /^[A-Za-z0-9+/=]+$/.test(signedTx);
}

export function decodeSignedTxBase64(signedTx: string): Uint8Array {
  return new Uint8Array(Buffer.from(signedTx, 'base64'));
}
