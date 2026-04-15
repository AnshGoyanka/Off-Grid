// GET /api/tx/:hash — On-chain transaction status (Algorand)

import {Router, Request, Response} from 'express';
import {getAlgodClient, getIndexerClient, isValidTxHash} from '../algorandClient';

const router = Router();

router.get('/:hash', async (req: Request, res: Response) => {
  const {hash} = req.params;

  if (!isValidTxHash(hash)) {
    return res.status(400).json({
      error: 'Invalid tx hash',
      message: 'Must be a valid Algorand transaction ID',
    });
  }

  try {
    const algod = getAlgodClient();
    const pending = await algod.pendingTransactionInformation(hash).do() as any;
    const confirmedRound = Number(pending.confirmedRound ?? 0);

    if (!confirmedRound || confirmedRound === 0) {
      // If pending endpoint can't find it, attempt indexer lookup before 404.
      try {
        const indexer = getIndexerClient();
        const tx = await indexer.lookupTransactionByID(hash).do() as any;
        const round = tx.transaction?.confirmedRound ?? 0;
        if (round > 0) {
          const status = await algod.status().do();
          const lastRound = Number(status.lastRound ?? 0);
          return res.json({
            hash,
            status: 'confirmed',
            from: tx.transaction?.sender ?? null,
            to: tx.transaction?.paymentTransaction?.receiver ?? null,
            blockNumber: round,
            confirmations: lastRound - round,
          });
        }
      } catch {
        // ignore fallback error and return pending/not_found below
      }

      if (!pending || Object.keys(pending).length === 0) {
        return res.status(404).json({
          hash,
          status: 'not_found',
          message: 'Transaction not found on chain (may not have propagated yet)',
        });
      }

      return res.json({
        hash,
        status: 'pending',
        from: pending.txn?.txn?.snd ?? pending.txn?.txn?.sender ?? null,
        to: pending.txn?.txn?.rcv ?? pending.txn?.txn?.receiver ?? null,
        blockNumber: null,
        confirmations: 0,
      });
    }

    const status = await algod.status().do();
    const confirmations = Number(status.lastRound ?? 0) - confirmedRound;

    return res.json({
      hash,
      status: 'confirmed',
      from: pending.txn?.txn?.snd ?? pending.txn?.txn?.sender ?? null,
      to: pending.txn?.txn?.rcv ?? pending.txn?.txn?.receiver ?? null,
      blockNumber: confirmedRound,
      confirmations,
    });
  } catch (err: any) {
    console.error('[tx] Error:', err.message);
    return res.status(502).json({
      error: 'RPC error',
      message: 'Failed to query transaction from Algorand network',
    });
  }
});

export default router;
