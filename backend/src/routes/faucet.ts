// POST /api/faucet — Request Algorand testnet ALGO
//
// If ALGORAND_FAUCET_MNEMONIC (or settler mnemonic fallback) is configured,
// backend sends a small ALGO transfer. Otherwise returns direct faucet URL.

import {Router, Request, Response} from 'express';
import algosdk from 'algosdk';
import {getAlgodClient, isValidAddress} from '../algorandClient';
import {config} from '../config';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const {address} = req.body as {address?: string};

  if (!address || !isValidAddress(address)) {
    return res.status(400).json({
      error: 'Invalid address',
      message: 'Must be a valid Algorand address',
    });
  }

  try {
    const mnemonic = config.faucet.mnemonic || config.settlement.senderMnemonic;
    if (!mnemonic) {
      return res.status(503).json({
        error: 'Faucet unavailable',
        message: `Backend faucet wallet is not configured. Use ${config.faucet.externalUrl}`,
        faucetUrl: config.faucet.externalUrl,
      });
    }

    const algod = getAlgodClient();
    const faucet = algosdk.mnemonicToSecretKey(mnemonic);
    const params = await algod.getTransactionParams().do();

    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: faucet.addr,
      receiver: address,
      amount: config.faucet.amountMicroAlgo,
      suggestedParams: {
        ...params,
        flatFee: true,
        fee: config.settlement.defaultFeeMicroAlgo,
      },
      note: new Uint8Array(Buffer.from('bitpay-faucet', 'utf8')),
    });

    const signed = txn.signTxn(faucet.sk);
    const sent = await algod.sendRawTransaction(signed).do();

    return res.json({
      success: true,
      address,
      txHash: sent.txid,
      amountAlgo: (config.faucet.amountMicroAlgo / 1_000_000).toString(),
      message: 'Testnet ALGO requested. Tokens should appear shortly.',
      faucetUrl: config.faucet.externalUrl,
    });
  } catch (err: any) {
    console.error('[faucet] Error:', err.message);
    return res.status(502).json({
      error: 'Faucet failed',
      message: `Could not send testnet ALGO. Try ${config.faucet.externalUrl} directly.`,
    });
  }
});

export default router;
