// Backend Service — HTTP client for the Bitpay relay backend
// All endpoints are optional; the app works offline without this service.

import {BACKEND_BASE_URL} from '../../utils/constants';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  algorand: {
    status: 'ok' | 'degraded' | 'unreachable';
    lastRound: number | null;
    latencyMs: number;
  };
}

export interface BalanceResponse {
  address: string;
  usdc: string;
  cusd: string;
  celo: string; // legacy key kept for compatibility with existing UI components
  algo?: string;
}

export interface SettleResponse {
  success: true;
  txHash: string;
  from: string | null;
  status: 'pending';
}

export interface TxStatusResponse {
  hash: string;
  status: 'confirmed' | 'pending' | 'failed' | 'not_found';
  blockNumber: number | null;
  confirmations: number;
}

export interface FaucetResponse {
  success: boolean;
  message: string;
}

class BackendService {
  private static instance: BackendService;
  private baseUrl: string;
  private timeoutMs: number = 8000;

  private constructor(baseUrl: string = BACKEND_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  static getInstance(): BackendService {
    if (!BackendService.instance) {
      BackendService.instance = new BackendService();
    }
    return BackendService.instance;
  }

  /** Override the backend URL (e.g. from user settings) */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, ''); // strip trailing slash
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  // ─── Endpoints ────────────────────────────────────────────────────────────

  /**
    * GET /api/health — check if backend + Algorand RPC are reachable.
   * Returns null on network error (do not throw).
   */
  async checkHealth(): Promise<HealthResponse | null> {
    try {
      const res = await this.get<HealthResponse>('/api/health');
      return res;
    } catch {
      return null;
    }
  }

  /**
   * GET /api/balance/:address — on-chain token balances.
   */
  async getBalance(address: string): Promise<BalanceResponse> {
    return this.get<BalanceResponse>(`/api/balance/${address}`);
  }

  /**
   * POST /api/settle — settle a payment on Algorand.
   */
  async settleTx(payload: {
    from?: string;
    to: string;
    amount: string;
    txId?: string;
    signedTx?: string;
  }): Promise<SettleResponse> {
    return this.post<SettleResponse>('/api/settle', payload);
  }

  /**
   * GET /api/tx/:hash — check on-chain confirmation status.
   */
  async getTxStatus(hash: string): Promise<TxStatusResponse> {
    return this.get<TxStatusResponse>(`/api/tx/${hash}`);
  }

  /**
    * GET /api/nonce/:address — account sequence helper from Algorand RPC.
   */
  async getNonce(address: string): Promise<number> {
    const res = await this.get<{address: string; nonce: number}>(
      `/api/nonce/${address}`,
    );
    return res.nonce;
  }

  /**
    * POST /api/faucet — request testnet ALGO tokens.
   */
  async requestFaucet(address: string): Promise<FaucetResponse> {
    return this.post<FaucetResponse>('/api/faucet', {address});
  }

  // ─── Private HTTP helpers ─────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {Accept: 'application/json'},
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<T>;
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      throw err;
    }
  }
}

export default BackendService;
