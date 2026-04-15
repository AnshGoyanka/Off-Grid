// GET /api/balance/:address — On-chain ALGO balance for an Algorand address

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
    const account = await algod.accountInformation(address).do();
    const algoRaw = Number(account.amount ?? 0);

    return res.json({
      address,
      // Keep legacy keys for app compatibility; cUSD/USDC are not used in Algorand MVP.
      usdc: '0',
      cusd: '0',
      celo: (algoRaw / 1_000_000).toString(),
      algo: (algoRaw / 1_000_000).toString(),
      algoRaw: algoRaw.toString(),
    });
  } catch (err: any) {
    console.error('[balance] Error:', err.message);
    return res.status(502).json({
      error: 'RPC error',
      message: 'Failed to fetch balance from Algorand network',
    });
  }
});

export default router;
