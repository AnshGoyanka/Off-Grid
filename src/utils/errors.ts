// Custom error types for Bitpay

export class OffgridError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'OffgridError';
    this.code = code;
  }
}

export class BleError extends OffgridError {
  constructor(message: string, code: string = 'BLE_ERROR') {
    super(message, code);
    this.name = 'BleError';
  }
}

export class BleConnectionError extends BleError {
  constructor(message: string) {
    super(message, 'BLE_CONNECTION_ERROR');
    this.name = 'BleConnectionError';
  }
}

export class BleScanError extends BleError {
  constructor(message: string) {
    super(message, 'BLE_SCAN_ERROR');
    this.name = 'BleScanError';
  }
}

export class BleChunkError extends BleError {
  constructor(message: string) {
    super(message, 'BLE_CHUNK_ERROR');
    this.name = 'BleChunkError';
  }
}

export class TransactionError extends OffgridError {
  constructor(message: string, code: string = 'TX_ERROR') {
    super(message, code);
    this.name = 'TransactionError';
  }
}

export class TransactionSigningError extends TransactionError {
  constructor(message: string) {
    super(message, 'TX_SIGNING_ERROR');
    this.name = 'TransactionSigningError';
  }
}

export class TransactionSerializationError extends TransactionError {
  constructor(message: string) {
    super(message, 'TX_SERIALIZATION_ERROR');
    this.name = 'TransactionSerializationError';
  }
}

export class DoubleSpendError extends TransactionError {
  constructor(message: string) {
    super(message, 'TX_DOUBLE_SPEND');
    this.name = 'DoubleSpendError';
  }
}

export class MeshError extends OffgridError {
  constructor(message: string, code: string = 'MESH_ERROR') {
    super(message, code);
    this.name = 'MeshError';
  }
}

export class GossipError extends MeshError {
  constructor(message: string) {
    super(message, 'GOSSIP_ERROR');
    this.name = 'GossipError';
  }
}

export class WalletError extends OffgridError {
  constructor(message: string, code: string = 'WALLET_ERROR') {
    super(message, code);
    this.name = 'WalletError';
  }
}

export class WalletCreationError extends WalletError {
  constructor(message: string) {
    super(message, 'WALLET_CREATION_ERROR');
    this.name = 'WalletCreationError';
  }
}

export class WalletImportError extends WalletError {
  constructor(message: string) {
    super(message, 'WALLET_IMPORT_ERROR');
    this.name = 'WalletImportError';
  }
}

export class EncryptionError extends OffgridError {
  constructor(message: string, code: string = 'ENCRYPTION_ERROR') {
    super(message, code);
    this.name = 'EncryptionError';
  }
}
