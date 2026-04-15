/// <reference types="jest" />

import algosdk from 'algosdk';
import TransactionSerializer from '../services/transaction/TransactionSerializer';
import {TransferIntent} from '../types/transaction';
import {toBase64} from '../utils/helpers';

function createSignedIntent(): TransferIntent {
  const account = algosdk.generateAccount();
  const intentPayload = {
    from: account.addr.toString(),
    to: algosdk.generateAccount().addr.toString(),
    amount: '10.00',
    tokenAddress: 'ALGO',
    tokenSymbol: 'ALGO',
    nonce: 7,
    vectorClock: {nodeA: 3},
    timestamp: Date.now(),
  };

  const payload = JSON.stringify(intentPayload);
  const signature = algosdk.signBytes(new Uint8Array(Buffer.from(payload, 'utf8')), account.sk);

  return {
    id: 'tx-1',
    ...intentPayload,
    signature: toBase64(signature),
    ttl: 7,
  };
}

describe('TransactionSerializer', () => {
  it('serialize returns JSON string', () => {
    const intent = createSignedIntent();
    const wire = TransactionSerializer.serialize(intent);
    expect(typeof wire).toBe('string');
  });

  it('deserialize restores transfer intent fields', () => {
    const intent = createSignedIntent();
    const wire = TransactionSerializer.serialize(intent);
    const parsed = TransactionSerializer.deserialize(wire);
    expect(parsed.id).toBe(intent.id);
    expect(parsed.from).toBe(intent.from);
    expect(parsed.amount).toBe(intent.amount);
  });

  it('validateSignature returns true for valid signature', () => {
    const intent = createSignedIntent();
    expect(TransactionSerializer.validateSignature(intent)).toBe(true);
  });

  it('validateSignature returns false for tampered amount', () => {
    const intent = createSignedIntent();
    const tampered = {...intent, amount: '999.00'};
    expect(TransactionSerializer.validateSignature(tampered)).toBe(false);
  });

  it('validateSignature returns false for invalid signature', () => {
    const intent = createSignedIntent();
    const invalid = {...intent, signature: 'ZmFrZXNpZw=='};
    expect(TransactionSerializer.validateSignature(invalid)).toBe(false);
  });

  it('full round-trip keeps signature verifiable', () => {
    const intent = createSignedIntent();
    const wire = TransactionSerializer.serialize(intent);
    const received = TransactionSerializer.deserialize(wire);
    expect(TransactionSerializer.validateSignature(received)).toBe(true);
  });
});
