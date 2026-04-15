// Transaction Serializer — Serialize/deserialize transfer intents for BLE transport
// Updated for offline mesh — no rawTransaction, includes vectorClock

import {TransferIntent, SerializedTransaction} from '../../types/transaction';
import {TransactionSerializationError} from '../../utils/errors';
import algosdk from 'algosdk';
import {fromBase64} from '../../utils/helpers';

class TransactionSerializer {
  /**
   * Serialize a transfer intent to a compact JSON string for mesh transport
   */
  static serialize(tx: SerializedTransaction | TransferIntent): string {
    try {
      const payload: SerializedTransaction = {
        id: tx.id,
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        tokenAddress: tx.tokenAddress,
        tokenSymbol: tx.tokenSymbol,
        nonce: tx.nonce,
        vectorClock: tx.vectorClock,
        signature: tx.signature,
        timestamp: tx.timestamp,
        ttl: tx.ttl,
      };
      return JSON.stringify(payload);
    } catch (error: any) {
      throw new TransactionSerializationError(
        `Serialization failed: ${error.message}`,
      );
    }
  }

  /**
   * Deserialize a JSON string back to a TransferIntent
   */
  static deserialize(data: string): TransferIntent {
    try {
      const parsed = JSON.parse(data);

      // Validate required fields
      const required = [
        'id',
        'from',
        'to',
        'amount',
        'tokenAddress',
        'tokenSymbol',
        'nonce',
        'vectorClock',
        'signature',
        'timestamp',
        'ttl',
      ];
      for (const field of required) {
        if (!(field in parsed)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Validate types
      if (typeof parsed.id !== 'string') throw new Error('id must be string');
      if (typeof parsed.from !== 'string') throw new Error('from must be string');
      if (typeof parsed.to !== 'string') throw new Error('to must be string');
      if (typeof parsed.amount !== 'string') throw new Error('amount must be string');
      if (typeof parsed.nonce !== 'number') throw new Error('nonce must be number');
      if (typeof parsed.timestamp !== 'number') throw new Error('timestamp must be number');
      if (typeof parsed.vectorClock !== 'object') throw new Error('vectorClock must be object');

      return parsed as TransferIntent;
    } catch (error: any) {
      if (error instanceof TransactionSerializationError) throw error;
      throw new TransactionSerializationError(
        `Deserialization failed: ${error.message}`,
      );
    }
  }

  /**
   * Validate a transfer intent's signature against the claimed sender.
   */
  static validateSignature(intent: TransferIntent): boolean {
    try {
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

      const payloadBytes = new Uint8Array(Buffer.from(intentPayload, 'utf8'));
      const signature = fromBase64(intent.signature);
      return algosdk.verifyBytes(payloadBytes, signature, intent.from);
    } catch {
      return false;
    }
  }
}

export default TransactionSerializer;
