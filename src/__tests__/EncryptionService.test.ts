import EncryptionService from '../services/encryption/EncryptionService';

// Reset singleton between tests (stateless, but good practice)
beforeEach(() => {
  (EncryptionService as any).instance = undefined;
});

describe('EncryptionService', () => {
  // ─── Singleton ─────────────────────────────────────────────────

  it('getInstance returns the same instance', () => {
    const a = EncryptionService.getInstance();
    const b = EncryptionService.getInstance();
    expect(a).toBe(b);
  });

  // ─── Encrypt / Decrypt roundtrip ───────────────────────────────

  it('decrypts back to the original plaintext', async () => {
    const svc = EncryptionService.getInstance();
    const plaintext = 'Hello, Bitpay!';
    const secret = 'shared-session-key-abc123';

    const ciphertext = await svc.encrypt(plaintext, secret);
    const recovered = await svc.decrypt(ciphertext, secret);

    expect(recovered).toBe(plaintext);
  });

  it('works with JSON payloads', async () => {
    const svc = EncryptionService.getInstance();
    const payload = JSON.stringify({
      from: '0xSender',
      to: '0xReceiver',
      amount: '42.00',
    });
    const secret = 'json-test-key';
    const ct = await svc.encrypt(payload, secret);
    const pt = await svc.decrypt(ct, secret);
    expect(JSON.parse(pt)).toEqual(JSON.parse(payload));
  });

  it('works with empty string plaintext', async () => {
    const svc = EncryptionService.getInstance();
    const ct = await svc.encrypt('', 'key');
    const pt = await svc.decrypt(ct, 'key');
    expect(pt).toBe('');
  });

  it('works with long messages', async () => {
    const svc = EncryptionService.getInstance();
    const plaintext = 'Offgrid '.repeat(500); // 4000 chars
    const secret = 'long-message-key';
    const ct = await svc.encrypt(plaintext, secret);
    const pt = await svc.decrypt(ct, secret);
    expect(pt).toBe(plaintext);
  });

  // ─── Ciphertext properties ─────────────────────────────────────

  it('ciphertext is a base64 string (not plaintext)', async () => {
    const svc = EncryptionService.getInstance();
    const ct = await svc.encrypt('secret data', 'key');
    // Should be base64 — no spaces, valid base64 chars
    expect(ct).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(ct).not.toContain('secret data');
  });

  it('same plaintext + key produces different ciphertext each time (random IV)', async () => {
    const svc = EncryptionService.getInstance();
    const ct1 = await svc.encrypt('same text', 'same key');
    const ct2 = await svc.encrypt('same text', 'same key');
    // Due to random IV, ciphertexts should differ (probabilistic, but 1/2^96 chance of collision)
    expect(ct1).not.toBe(ct2);
  });

  it('different keys produce different ciphertexts', async () => {
    const svc = EncryptionService.getInstance();
    const ct1 = await svc.encrypt('hello', 'key-one');
    const ct2 = await svc.encrypt('hello', 'key-two');
    expect(ct1).not.toBe(ct2);
  });

  // ─── Wrong key decryption ──────────────────────────────────────

  it('decrypting with the wrong key yields garbled output (not the original)', async () => {
    const svc = EncryptionService.getInstance();
    const ct = await svc.encrypt('sensitive payload', 'correct-key');
    const wrong = await svc.decrypt(ct, 'wrong-key');
    expect(wrong).not.toBe('sensitive payload');
  });

  // ─── Special characters ────────────────────────────────────────

  it('handles unicode and emoji in plaintext', async () => {
    const svc = EncryptionService.getInstance();
    const plaintext = 'Cześć 你好 مرحبا 🌍💸';
    const ct = await svc.encrypt(plaintext, 'unicode-key');
    const pt = await svc.decrypt(ct, 'unicode-key');
    expect(pt).toBe(plaintext);
  });
});
