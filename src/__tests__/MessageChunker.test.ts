import MessageChunker from '../services/ble/MessageChunker';
import {BleChunkError} from '../utils/errors';
import {CHUNK_HEADER_SIZE} from '../types/ble';

// A safe test MTU — payload per chunk = MTU - CHUNK_HEADER_SIZE(12)
const TEST_MTU = 32; // payload size = 20 chars per chunk

describe('MessageChunker', () => {
  let chunker: MessageChunker;

  beforeEach(() => {
    chunker = new MessageChunker();
  });

  afterEach(() => {
    chunker.destroy();
  });

  // ─── Chunking ──────────────────────────────────────────────────

  it('produces one chunk for a short message', () => {
    const data = 'hello'; // 5 chars < 20 payload
    const chunks = chunker.chunk(data, TEST_MTU);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].sequenceNumber).toBe(0);
    expect(chunks[0].totalChunks).toBe(1);
    expect(chunks[0].payload).toBe('hello');
  });

  it('produces multiple chunks for a long message', () => {
    const data = 'A'.repeat(100); // 100 chars, payload=20 → 5 chunks
    const chunks = chunker.chunk(data, TEST_MTU);
    expect(chunks).toHaveLength(5);
  });

  it('all chunks share the same messageId', () => {
    const chunks = chunker.chunk('X'.repeat(80), TEST_MTU);
    const ids = new Set(chunks.map(c => c.messageId));
    expect(ids.size).toBe(1);
  });

  it('sequence numbers run 0 → N-1', () => {
    const chunks = chunker.chunk('Z'.repeat(60), TEST_MTU); // ceil(60/20) = 3
    expect(chunks.map(c => c.sequenceNumber)).toEqual([0, 1, 2]);
  });

  it('totalChunks is consistent across all chunks', () => {
    const chunks = chunker.chunk('Q'.repeat(60), TEST_MTU);
    const totals = new Set(chunks.map(c => c.totalChunks));
    expect(totals.size).toBe(1);
    expect([...totals][0]).toBe(3);
  });

  it('chunks concatenate back to the original message', () => {
    const original = 'Hello Offgrid World! '.repeat(5);
    const chunks = chunker.chunk(original, TEST_MTU);
    const reconstructed = chunks.map(c => c.payload).join('');
    expect(reconstructed).toBe(original);
  });

  it('throws BleChunkError when MTU equals CHUNK_HEADER_SIZE (zero payload)', () => {
    expect(() => chunker.chunk('data', CHUNK_HEADER_SIZE)).toThrow(
      BleChunkError,
    );
  });

  it('throws BleChunkError when MTU is smaller than CHUNK_HEADER_SIZE', () => {
    expect(() => chunker.chunk('data', 4)).toThrow(BleChunkError);
  });

  // ─── Reassembly in order ───────────────────────────────────────

  it('reassembles a single-chunk message', () => {
    const chunks = chunker.chunk('ping', TEST_MTU);
    const result = chunker.receiveChunk(chunks[0]);
    expect(result).toBe('ping');
  });

  it('reassembles a multi-chunk message in order', () => {
    const original = '1234567890'.repeat(10); // 100 chars → 5 chunks
    const chunks = chunker.chunk(original, TEST_MTU);
    let result: string | null = null;
    for (const chunk of chunks) {
      result = chunker.receiveChunk(chunk);
    }
    expect(result).toBe(original);
  });

  it('returns null for every chunk except the last', () => {
    const chunks = chunker.chunk('AB'.repeat(30), TEST_MTU); // 60 chars → 3
    expect(chunker.receiveChunk(chunks[0])).toBeNull();
    expect(chunker.receiveChunk(chunks[1])).toBeNull();
    expect(chunker.receiveChunk(chunks[2])).toBe('AB'.repeat(30));
  });

  // ─── Reassembly out of order ───────────────────────────────────

  it('reassembles chunks delivered in reverse order', () => {
    const original = 'ABCDEFGHIJKLMNOPQRST'.repeat(3); // 60 chars → 3 chunks
    const chunks = chunker.chunk(original, TEST_MTU);
    const reversed = [...chunks].reverse();
    let result: string | null = null;
    for (const chunk of reversed) {
      result = chunker.receiveChunk(chunk);
    }
    expect(result).toBe(original);
  });

  it('reassembles chunks delivered in arbitrary order', () => {
    const original = '0123456789'.repeat(8); // 80 chars → 4 chunks
    const chunks = chunker.chunk(original, TEST_MTU);
    // Scramble: 2, 0, 3, 1
    const order = [2, 0, 3, 1];
    let result: string | null = null;
    for (const i of order) {
      result = chunker.receiveChunk(chunks[i]);
    }
    expect(result).toBe(original);
  });

  // ─── Duplicate chunks ──────────────────────────────────────────

  it('ignores duplicate chunks (same seq number)', () => {
    const chunks = chunker.chunk('AAAA'.repeat(15), TEST_MTU); // 60 chars → 3
    chunker.receiveChunk(chunks[0]);
    chunker.receiveChunk(chunks[0]); // duplicate — should be ignored
    chunker.receiveChunk(chunks[1]);
    const result = chunker.receiveChunk(chunks[2]);
    expect(result).toBe('AAAA'.repeat(15));
  });

  // ─── Error handling ────────────────────────────────────────────

  it('throws BleChunkError for negative sequence number', () => {
    const badChunk = {
      messageId: 'abc',
      sequenceNumber: -1,
      totalChunks: 2,
      payload: 'X',
    };
    expect(() => chunker.receiveChunk(badChunk)).toThrow(BleChunkError);
  });

  it('throws BleChunkError when sequenceNumber >= totalChunks', () => {
    const badChunk = {
      messageId: 'abc',
      sequenceNumber: 3,
      totalChunks: 3,
      payload: 'X',
    };
    expect(() => chunker.receiveChunk(badChunk)).toThrow(BleChunkError);
  });

  // ─── Serialization ─────────────────────────────────────────────

  it('serializeChunk produces valid JSON', () => {
    const chunk = chunker.chunk('test payload', TEST_MTU)[0];
    const serialized = MessageChunker.serializeChunk(chunk);
    expect(typeof serialized).toBe('string');
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('deserializeChunk round-trips correctly', () => {
    const chunk = chunker.chunk('BLE round-trip test', TEST_MTU)[0];
    const serialized = MessageChunker.serializeChunk(chunk);
    const deserialized = MessageChunker.deserializeChunk(serialized);
    expect(deserialized.messageId).toBe(chunk.messageId);
    expect(deserialized.payload).toBe(chunk.payload);
    expect(deserialized.sequenceNumber).toBe(chunk.sequenceNumber);
    expect(deserialized.totalChunks).toBe(chunk.totalChunks);
  });

  it('deserializeChunk throws BleChunkError on invalid JSON', () => {
    expect(() => MessageChunker.deserializeChunk('not json')).toThrow(
      BleChunkError,
    );
  });

  it('deserializeChunk throws BleChunkError on missing fields', () => {
    const bad = JSON.stringify({messageId: 'x', sequenceNumber: 0});
    expect(() => MessageChunker.deserializeChunk(bad)).toThrow(BleChunkError);
  });

  // ─── Pending count ─────────────────────────────────────────────

  it('tracks pending reassembly buffers', () => {
    // Start reassembly of a 3-chunk message (send first 2)
    const chunks = chunker.chunk('Z'.repeat(60), TEST_MTU);
    chunker.receiveChunk(chunks[0]);
    chunker.receiveChunk(chunks[1]);
    // One incomplete message in flight
    expect(chunker.getPendingCount()).toBe(1);
    // Complete it
    chunker.receiveChunk(chunks[2]);
    expect(chunker.getPendingCount()).toBe(0);
  });
});
