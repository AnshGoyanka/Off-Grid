// GET /api/health — Server and Algorand RPC liveness check

import {Router, Request, Response} from 'express';
import {getAlgodClient} from '../algorandClient';
import {config} from '../config';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const start = Date.now();
  let algorandStatus: 'ok' | 'degraded' | 'unreachable' = 'unreachable';
  let lastRound: number | null = null;

  try {
    const algod = getAlgodClient();
    const status = await algod.status().do();
    lastRound = Number(status.lastRound);
    algorandStatus = 'ok';
  } catch {
    algorandStatus = 'unreachable';
  }

  const latencyMs = Date.now() - start;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    algorand: {
      status: algorandStatus,
      network: config.algorand.network,
      lastRound,
      latencyMs,
    },
  });
});

export default router;
