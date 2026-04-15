// GET /api/nonce/:address — Algorand account sequence helper
// Kept for compatibility with existing app flow; returns a best-effort sequence value.

import {Router, Request, Response} from 'express';
import {getAlgodClient, isValidAddress} from '../algorandClient';

const router = Router();

router.get('/:address', async (req: Request, res: Response) => {
  const {address} = req.params;

  if (!isValidAddress(address)) {
    return res.status(400).json({
      error: 'Invalid address',
      message: 'Must be a valid Algorand address',
    });
  }

  try {
    const algod = getAlgodClient();
    const [account, status] = await Promise.all([
      algod.accountInformation(address).do(),
      algod.status().do(),
    ]);
    const round = Number(status.lastRound ?? 0);
    const nonce = Number((account as any).round ?? round);

    return res.json({
      address,
      nonce,
      round,
      minRound: round + 1,
    });
  } catch (err: any) {
    console.error('[nonce] Error:', err.message);
    return res.status(502).json({
      error: 'RPC error',
      message: 'Failed to fetch account sequence from Algorand network',
    });
  }
});

export default router;
