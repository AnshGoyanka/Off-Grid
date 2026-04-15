// Transaction Manager — Offline-first transfer intents
// Creates signed transfer intents, verifies incoming ones, manages local ledger
// No on-chain interaction — all BLE mesh based

import {
  Transaction,
  TransferIntent,
  TransactionStatus,
  TransactionReceipt,
} from '../../types/transaction';
import {MeshMessageType} from '../../types/mesh';
import {
  DEFAULT_TOKEN_ADDRESS,
  DEFAULT_TOKEN_DECIMALS,
  DEFAULT_TOKEN_SYMBOL,
} from '../../utils/constants';
import {TransactionSigningError} from '../../utils/errors';
import {generateMessageId} from '../../utils/helpers';
import WalletService from '../wallet/WalletService';
import GossipProtocol from '../mesh/GossipProtocol';
import TransactionSerializer from './TransactionSerializer';
import NonceManager from './NonceManager';
import LocalLedger from '../ledger/LocalLedger';
import VectorClock from '../ledger/VectorClock';
import {store} from '../../store';
import {
  addTransaction,
  updateTransactionStatus,
  attachReceipt,
} from '../../store/transactionSlice';
import algosdk from 'algosdk';
import {fromBase64} from '../../utils/helpers';

class TransactionManager {
  private static instance: TransactionManager;
  private walletService: WalletService;
  private gossipProtocol: GossipProtocol;
  private nonceManager: NonceManager;
  private localLedger: LocalLedger;
  private vectorClock: VectorClock | null = null;

  private constructor() {
    this.walletService = WalletService.getInstance();
    this.gossipProtocol = GossipProtocol.getInstance();
    this.nonceManager = NonceManager.getInstance();
    this.localLedger = LocalLedger.getInstance();
  }

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Initialize — set up BLE message handlers and vector clock
   */
  initialize(): void {
    const selfId = store.getState().mesh.selfId;
    this.vectorClock = new VectorClock(selfId);

    // Listen for incoming transfer intents from the mesh
    this.gossipProtocol.onMessage(
      MeshMessageType.TRANSACTION,
      message => {
        this.handleIncomingTransferIntent(message.payload);
      },
    );

    // Listen for receipts
    this.gossipProtocol.onMessage(
      MeshMessageType.RECEIPT,
      message => {
        this.handleIncomingReceipt(message.payload);
      },
    );
  }

  /**
   * Create a signed transfer intent (100% offline)
   * Signs the payment data with the local private key
   * Does NOT build an EVM transaction — that happens at settlement time
   */
  async createTransferIntent(
    to: string,
    amount: string,
    tokenAddress: string = DEFAULT_TOKEN_ADDRESS,
    tokenSymbol: string = DEFAULT_TOKEN_SYMBOL,
  ): Promise<Transaction> {
    const from = this.walletService.getAddress();
    const nonce = this.nonceManager.getNextNonce(from);

    // Check local balance
    if (!this.localLedger.hasEnoughBalance(tokenAddress, amount)) {
      throw new TransactionSigningError('Insufficient local balance');
    }

    // Increment vector clock for this event
    const clock = this.vectorClock!.increment();

    // Build the intent payload to sign
    const intentPayload = JSON.stringify({
      from,
      to,
      amount,
      tokenAddress,
      tokenSymbol,
      nonce,
      vectorClock: clock,
      timestamp: Date.now(),
    });

    try {
      // Sign the payload with the local private key
      const signature = await this.walletService.signMessage(intentPayload);

      const transaction: Transaction = {
        id: generateMessageId(),
        from,
        to,
        amount,
        tokenAddress,
        tokenSymbol,
        nonce,
        vectorClock: clock,
        timestamp: Date.now(),
        signature,
        ttl: 7,
        status: TransactionStatus.SIGNED,
      };

      // Debit local ledger immediately
      this.localLedger.debit(
        transaction.id,
        from,
        to,
        amount,
        tokenAddress,
        tokenSymbol,
        signature,
      );

      // Add to Redux state
      store.dispatch(addTransaction(transaction));

      return transaction;
    } catch (error: any) {
      throw new TransactionSigningError(
        `Failed to sign transfer intent: ${error.message}`,
      );
    }
  }

  /**
   * Broadcast a signed transfer intent over BLE mesh
   */
  async broadcastTransferIntent(transaction: Transaction): Promise<void> {
    const serialized = TransactionSerializer.serialize(transaction);

    const selfId = store.getState().mesh.selfId;
    await this.gossipProtocol.publish(
      MeshMessageType.TRANSACTION,
      serialized,
      selfId,
    );

    store.dispatch(
      updateTransactionStatus({
        id: transaction.id,
        status: TransactionStatus.GOSSIPED,
      }),
    );
  }

  /**
   * Full send flow: create intent → sign → debit → broadcast over BLE
   */
  async send(
    to: string,
    amount: string,
    tokenAddress?: string,
    tokenSymbol?: string,
  ): Promise<Transaction> {
    const tx = await this.createTransferIntent(to, amount, tokenAddress, tokenSymbol);
    await this.broadcastTransferIntent(tx);
    return tx;
  }

  /**
   * Verify an incoming transfer intent from a peer
    * - Checks signature validity
   * - Checks vector clock ordering (anti-double-spend)
   * - Credits local ledger on success
   */
  async verifyTransferIntent(intent: TransferIntent): Promise<boolean> {
    // 1. Reconstruct the signed payload
    const intentPayload = JSON.stringify({
      from: intent.from,
      to: intent.to,
      amount: intent.amount,
      tokenAddress: intent.tokenAddress,
      tokenSymbol: intent.tokenSymbol,
      nonce: intent.nonce,
      vectorClock: intent.vectorClock,
      timestamp: intent.timestamp,
    });

    // 2. Verify signature
    try {
      const payloadBytes = new Uint8Array(Buffer.from(intentPayload, 'utf8'));
      const signature = fromBase64(intent.signature);
      const valid = algosdk.verifyBytes(payloadBytes, signature, intent.from);
      if (!valid) {
        console.warn(`[TxManager] Signature mismatch for ${intent.id}`);
        return false;
      }
    } catch (error: any) {
      console.warn('[TxManager] Signature verification failed:', error.message);
      return false;
    }

    // 4. Merge vector clock (anti-double-spend ordering)
    if (this.vectorClock && intent.vectorClock) {
      this.vectorClock.merge(intent.vectorClock);
    }

    return true;
  }

  /**
   * Create and send a signed receipt back to the sender
   */
  async sendReceipt(txId: string, from: string): Promise<void> {
    const myAddress = this.walletService.getAddress();

    const receiptPayload = JSON.stringify({txId, receiverAddress: myAddress});
    const receiverSignature = await this.walletService.signMessage(receiptPayload);

    const receipt: TransactionReceipt = {
      txId,
      receiverAddress: myAddress,
      receiverSignature,
      timestamp: Date.now(),
    };

    const selfId = store.getState().mesh.selfId;
    await this.gossipProtocol.publish(
      MeshMessageType.RECEIPT,
      JSON.stringify(receipt),
      selfId,
    );
  }

  // ─── Private Handlers ─────────────────────────────────────

  private async handleIncomingTransferIntent(payload: string): Promise<void> {
    try {
      const intent = TransactionSerializer.deserialize(payload);

      // Dedup check
      if (this.nonceManager.isDuplicate(intent.id)) {
        return;
      }
      this.nonceManager.markSeen(intent.id);

      // Check if this transfer is for us
      const myAddress = this.walletService.getAddress();
      const isForMe = intent.to.toLowerCase() === myAddress.toLowerCase();

      // Verify the signature regardless (mesh integrity)
      const isValid = await this.verifyTransferIntent(intent);

      if (!isValid) {
        console.warn(`[TxManager] Invalid transfer intent ${intent.id} — rejected`);
        return;
      }

      if (isForMe) {
        // Credit our local ledger
        this.localLedger.credit(
          intent.id,
          intent.from,
          intent.to,
          intent.amount,
          intent.tokenAddress,
          intent.tokenSymbol,
          intent.signature,
        );

        // Store as verified
        const transaction: Transaction = {
          ...intent,
          status: TransactionStatus.VERIFIED,
        };
        store.dispatch(addTransaction(transaction));

        // Send receipt back
        await this.sendReceipt(intent.id, intent.from);

        console.log(
          `[TxManager] Received ${intent.amount} ${intent.tokenSymbol} from ${intent.from}`,
        );
      } else {
        // Not for us, but store it (transparent forwarding, gossip handles relaying)
        const transaction: Transaction = {
          ...intent,
          status: TransactionStatus.GOSSIPED,
        };
        store.dispatch(addTransaction(transaction));
      }
    } catch (error: any) {
      console.warn('[TxManager] Invalid incoming transfer:', error.message);
    }
  }

  private handleIncomingReceipt(payload: string): void {
    try {
      const receipt = JSON.parse(payload) as TransactionReceipt;

      store.dispatch(
        attachReceipt({txId: receipt.txId, receipt}),
      );

      console.log(`[TxManager] Received receipt for ${receipt.txId}`);
    } catch (error: any) {
      console.warn('[TxManager] Invalid receipt:', error.message);
    }
  }
}

export default TransactionManager;
