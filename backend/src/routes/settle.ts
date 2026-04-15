// POST /api/settle — Relay payment settlement to Algorand TestNet
//
// Supports two modes:
// 1) pre-signed Algorand txn relay: { signedTx: "<base64>" }
// 2) backend-signed payment for hackathon MVP:
//    { from?: string, to: string, amount: string, txId?: string }

import {Router, Request, Response} from 'express';
import algosdk from 'algosdk';
import {
  decodeSignedTxBase64,
  getAlgodClient,
  isValidAddress,
  isValidSignedTx,
} from '../algorandClient';
import {config} from '../config';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const {
    signedTx,
    from,
    to,
    amount,
    txId,
  } = req.body as {
    signedTx?: string;
    from?: string;
    to?: string;
    amount?: string;
    txId?: string;
  };

  try {
    const algod = getAlgodClient();

    if (signedTx) {
      if (!isValidSignedTx(signedTx)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'signedTx must be a base64-encoded signed Algorand transaction',
        });
      }

      const signedBytes = decodeSignedTxBase64(signedTx);
      const sendResult = await algod.sendRawTransaction(signedBytes).do();

      return res.status(202).json({
        success: true,
        txHash: sendResult.txid,
        from: from ?? null,
        to: to ?? null,
        status: 'pending',
        message: 'Transaction relayed to Algorand network. Use GET /api/tx/:hash to track.',
      });
    }

    if (!to || !isValidAddress(to) || !amount) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'For backend settlement provide: to (Algorand address) and amount (ALGO)',
      });
    }

    if (!config.settlement.senderMnemonic) {
      return res.status(500).json({
        error: 'Settlement misconfigured',
        message: 'ALGORAND_SETTLER_MNEMONIC is missing on backend',
      });
    }

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'amount must be a positive ALGO value',
      });
    }

    const sender = algosdk.mnemonicToSecretKey(config.settlement.senderMnemonic);
    const suggested = await algod.getTransactionParams().do();
    const transferTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: sender.addr,
      receiver: to,
      amount: Math.round(parsed * 1_000_000),
      suggestedParams: {
        ...suggested,
        fee: config.settlement.defaultFeeMicroAlgo,
        flatFee: true,
      },
      note: txId ? new Uint8Array(Buffer.from(txId, 'utf8')) : undefined,
    });

    const signed = transferTxn.signTxn(sender.sk);
    const sendResult = await algod.sendRawTransaction(signed).do();

    console.log(`[settle] Relayed tx ${sendResult.txid} from ${sender.addr}`);

    return res.status(202).json({
      success: true,
      txHash: sendResult.txid,
      from: from ?? sender.addr,
      to,
      status: 'pending',
      message: 'Transaction relayed to Algorand network. Use GET /api/tx/:hash to track.',
    });
  } catch (err: any) {
    const message: string = err.message ?? 'Unknown error';

    if (message.toLowerCase().includes('overspend') || message.toLowerCase().includes('below min')) {
      return res.status(422).json({
        error: 'Insufficient funds',
        message: 'Sender has insufficient ALGO for payment/fees',
      });
    }

    if (message.toLowerCase().includes('already in ledger')) {
      return res.status(409).json({
        error: 'Duplicate transaction',
        message: 'Transaction already submitted',
      });
    }

    console.error('[settle] Broadcast error:', message);
    return res.status(502).json({
      error: 'Broadcast failed',
      message: 'Failed to relay transaction to Algorand network',
    });
  }
});

export default router;
