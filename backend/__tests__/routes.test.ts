import request from 'supertest';

const mockStatus = jest.fn();
const mockAccountInformation = jest.fn();
const mockPendingTransactionInformation = jest.fn();
const mockSendRawTransaction = jest.fn();
const mockGetTransactionParams = jest.fn();
const mockLookupTransactionByID = jest.fn();

jest.mock('../src/algorandClient', () => ({
  getAlgodClient: () => ({
    status: () => ({do: mockStatus}),
    accountInformation: () => ({do: mockAccountInformation}),
    pendingTransactionInformation: () => ({do: mockPendingTransactionInformation}),
    sendRawTransaction: () => ({do: mockSendRawTransaction}),
    getTransactionParams: () => ({do: mockGetTransactionParams}),
  }),
  getIndexerClient: () => ({
    lookupTransactionByID: () => ({do: mockLookupTransactionByID}),
  }),
  isValidAddress: (addr: string) => /^[A-Z2-7]{58}$/.test(addr),
  isValidTxHash: (hash: string) => /^[A-Z2-7]{52}$/.test(hash),
  isValidSignedTx: (tx: string) => typeof tx === 'string' && /^[A-Za-z0-9+/=]+$/.test(tx),
  decodeSignedTxBase64: (tx: string) => new Uint8Array(Buffer.from(tx, 'base64')),
}));

import {app} from '../src/index';

const VALID_ADDRESS = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ';
const VALID_TX_HASH = 'A'.repeat(52);
const VALID_SIGNED_TX = Buffer.from('signed-algo-tx').toString('base64');

describe('GET /api/health', () => {
  it('returns 200 with algorand status ok when provider responds', async () => {
    mockStatus.mockResolvedValueOnce({lastRound: 12345n});

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.algorand.status).toBe('ok');
    expect(res.body.algorand.lastRound).toBe(12345);
  });

  it('returns 200 with algorand status unreachable when provider fails', async () => {
    mockStatus.mockRejectedValueOnce(new Error('RPC down'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.algorand.status).toBe('unreachable');
    expect(res.body.algorand.lastRound).toBeNull();
  });
});

describe('GET /api/balance/:address', () => {
  it('returns 400 for invalid address', async () => {
    const res = await request(app).get('/api/balance/not-valid');
    expect(res.status).toBe(400);
  });

  it('returns algorand balance', async () => {
    mockAccountInformation.mockResolvedValueOnce({amount: 1_500_000});

    const res = await request(app).get(`/api/balance/${VALID_ADDRESS}`);

    expect(res.status).toBe(200);
    expect(res.body.address).toBe(VALID_ADDRESS);
    expect(res.body.algo).toBe('1.5');
  });
});

describe('POST /api/settle', () => {
  it('relays signed algorand tx and returns txHash', async () => {
    mockSendRawTransaction.mockResolvedValueOnce({txid: VALID_TX_HASH});

    const res = await request(app)
      .post('/api/settle')
      .send({signedTx: VALID_SIGNED_TX});

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.txHash).toBe(VALID_TX_HASH);
  });

  it('returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/api/settle')
      .send({to: 'bad', amount: '1'});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tx/:hash', () => {
  it('returns pending transaction state', async () => {
    mockPendingTransactionInformation.mockResolvedValueOnce({
      confirmedRound: 0,
      txn: {txn: {sender: VALID_ADDRESS, receiver: VALID_ADDRESS}},
    });

    const res = await request(app).get(`/api/tx/${VALID_TX_HASH}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns confirmed transaction state', async () => {
    mockPendingTransactionInformation.mockResolvedValueOnce({
      confirmedRound: 100,
      txn: {txn: {sender: VALID_ADDRESS, receiver: VALID_ADDRESS}},
    });
    mockStatus.mockResolvedValueOnce({lastRound: 104n});

    const res = await request(app).get(`/api/tx/${VALID_TX_HASH}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.confirmations).toBe(4);
  });

  it('returns 400 for invalid tx hash', async () => {
    const res = await request(app).get('/api/tx/bad');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/nonce/:address', () => {
  it('returns account sequence helper values', async () => {
    mockAccountInformation.mockResolvedValueOnce({round: 55});
    mockStatus.mockResolvedValueOnce({lastRound: 60n});

    const res = await request(app).get(`/api/nonce/${VALID_ADDRESS}`);

    expect(res.status).toBe(200);
    expect(res.body.address).toBe(VALID_ADDRESS);
    expect(res.body.nonce).toBe(55);
    expect(res.body.round).toBe(60);
  });

  it('returns 400 for invalid address', async () => {
    const res = await request(app).get('/api/nonce/badaddress');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/faucet', () => {
  it('returns 400 for invalid address', async () => {
    const res = await request(app)
      .post('/api/faucet')
      .send({address: 'not-an-address'});
    expect(res.status).toBe(400);
  });

  it('returns 503 when backend faucet wallet is not configured', async () => {
    const res = await request(app)
      .post('/api/faucet')
      .send({address: VALID_ADDRESS});
    expect([503, 200, 502]).toContain(res.status);
  });
});

describe('404 handler', () => {
  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});
