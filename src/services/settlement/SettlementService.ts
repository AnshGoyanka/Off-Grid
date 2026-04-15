// Settlement Service — Deferred on-chain transaction submission
// This service is OPTIONAL — the core app works 100% offline without it.
// When a device eventually gets internet, this submits queued transfer intents
// to Algorand through backend relay.

import {TransactionStatus} from '../../types/transaction';
import {DEFAULT_RPC_URL} from '../../utils/constants';
import {store} from '../../store';
import {updateTransactionStatus} from '../../store/transactionSlice';
import {markSettled} from '../../store/ledgerSlice';
import WalletService from '../wallet/WalletService';
import {LedgerEntry} from '../../store/ledgerSlice';
import LocalLedger from '../ledger/LocalLedger';
import BackendService from '../backend/BackendService';

const SETTLEMENT_INTERVAL_MS = 30000;
const MAX_BATCH_SIZE = 10;

class SettlementService {
  private static instance: SettlementService;
  private walletService: WalletService;
  private localLedger: LocalLedger;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;
  private isRunning: boolean = false;

  private constructor() {
    this.walletService = WalletService.getInstance();
    this.localLedger = LocalLedger.getInstance();
  }

  static getInstance(): SettlementService {
    if (!SettlementService.instance) {
      SettlementService.instance = new SettlementService();
    }
    return SettlementService.instance;
  }

  start(rpcUrl: string = DEFAULT_RPC_URL): void {
    if (this.isRunning) return;
    void rpcUrl;

    this.isRunning = true;
    this.processSettlement();
    this.processTimer = setInterval(() => {
      this.processSettlement();
    }, SETTLEMENT_INTERVAL_MS);

    console.log('[SettlementService] Started settlement processing');
  }

  stop(): void {
    this.isRunning = false;
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }
    console.log('[SettlementService] Stopped');
  }

  isActive(): boolean {
    return this.isRunning;
  }

  async processSettlement(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const unsettled = this.localLedger.getUnsettled();
      const debits = unsettled
        .filter(e => e.type === 'DEBIT')
        .slice(0, MAX_BATCH_SIZE);

      for (const entry of debits) {
        try {
          await this.settleOnChain(entry);
        } catch (error: any) {
          console.warn(
            `[SettlementService] Failed to settle ${entry.txId}:`,
            error.message,
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async settleOnChain(entry: LedgerEntry): Promise<void> {
    const from = this.walletService.getAddress();
    const settled = await BackendService.getInstance().settleTx({
      from,
      to: entry.to,
      amount: entry.amount,
      txId: entry.txId,
    });

    const txHash = settled.txHash;
    console.log(`[SettlementService] Relayed via backend: ${txHash}`);

    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await BackendService.getInstance().getTxStatus(txHash);
      if (status.status === 'confirmed') {
        store.dispatch(markSettled(entry.txId));
        store.dispatch(
          updateTransactionStatus({
            id: entry.txId,
            status: TransactionStatus.SETTLED,
            txHash,
          }),
        );
        console.log(`[SettlementService] Settled ${entry.txId}: ${txHash}`);
        return;
      }
      if (status.status === 'failed' || status.status === 'not_found') {
        throw new Error(`Settlement failed: ${status.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    store.dispatch(markSettled(entry.txId));
    store.dispatch(
      updateTransactionStatus({
        id: entry.txId,
        status: TransactionStatus.SETTLED,
        txHash,
      }),
    );
    console.log(`[SettlementService] Marked as settled (pending finality): ${entry.txId}`);
  }
}

export default SettlementService;
