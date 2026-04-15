// Settlement Service Factory — Triggers settlement when internet becomes available
// Uses NetInfo (react-native) to detect connectivity changes
// This is OPTIONAL — the core offline mesh works without it

import SettlementService from './SettlementService';
import {DEFAULT_RPC_URL} from '../../utils/constants';
import BackendService from '../backend/BackendService';

class SettlementServiceFactory {
  private static instance: SettlementServiceFactory;
  private settlementService: SettlementService;
  private isMonitoring: boolean = false;
  private connectivityCheckTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {
    this.settlementService = SettlementService.getInstance();
  }

  static getInstance(): SettlementServiceFactory {
    if (!SettlementServiceFactory.instance) {
      SettlementServiceFactory.instance = new SettlementServiceFactory();
    }
    return SettlementServiceFactory.instance;
  }

  /**
   * Start monitoring for internet connectivity
   * When connectivity is detected, automatically starts the settlement service
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Periodic connectivity check (fallback if NetInfo is unavailable)
    this.connectivityCheckTimer = setInterval(async () => {
      const isOnline = await this.checkConnectivity();
      this.onConnectivityChange(isOnline);
    }, 30000); // Check every 30 seconds

    console.log('[SettlementFactory] Started connectivity monitoring');
  }

  /**
   * Stop monitoring and settlement
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.connectivityCheckTimer) {
      clearInterval(this.connectivityCheckTimer);
      this.connectivityCheckTimer = null;
    }
    this.settlementService.stop();
    console.log('[SettlementFactory] Stopped');
  }

  /**
   * Manually trigger settlement (e.g., when user taps "Sync Now")
   */
  async triggerManualSettlement(): Promise<void> {
    const isOnline = await this.checkConnectivity();
    if (!isOnline) {
      console.log('[SettlementFactory] Cannot settle — no internet');
      return;
    }

    if (!this.settlementService.isActive()) {
      this.settlementService.start(DEFAULT_RPC_URL);
    }
    await this.settlementService.processSettlement();
  }

  /**
   * Check if settlement is currently active
   */
  isSettling(): boolean {
    return this.settlementService.isActive();
  }

  // ─── Private ───

  private onConnectivityChange(isOnline: boolean): void {
    if (isOnline && !this.settlementService.isActive()) {
      this.settlementService.start(DEFAULT_RPC_URL);
      console.log('[SettlementFactory] Internet detected — starting settlement');
    } else if (!isOnline && this.settlementService.isActive()) {
      this.settlementService.stop();
      console.log('[SettlementFactory] Internet lost — pausing settlement');
    }
  }

  private async checkConnectivity(): Promise<boolean> {
    // Prefer backend health check — it validates Algorand RPC too.
    const health = await BackendService.getInstance().checkHealth();
    if (health !== null) {
      return health.algorand.status === 'ok';
    }
    // Fallback: direct HEAD ping to Algorand RPC when backend is unreachable.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch('https://testnet-api.algonode.cloud/health', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default SettlementServiceFactory;
