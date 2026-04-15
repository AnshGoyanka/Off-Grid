// Message Chunker — Fragment and reassemble messages for BLE MTU limits

import {BleChunk, DEFAULT_MTU, CHUNK_HEADER_SIZE} from '../../types/ble';
import {BleChunkError} from '../../utils/errors';
import {generateMessageId} from '../../utils/helpers';

// Timeout for incomplete message reassembly (30 seconds)
const REASSEMBLY_TIMEOUT_MS = 30000;

interface ReassemblyBuffer {
  messageId: string;
  totalChunks: number;
  receivedChunks: Map<number, string>;
  createdAt: number;
}

class MessageChunker {
  private reassemblyBuffers: Map<string, ReassemblyBuffer> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodic cleanup of incomplete reassembly buffers
    // unref() so the timer never prevents the Node process from exiting
    // (important for test environments and graceful shutdown)
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleBuffers();
    }, REASSEMBLY_TIMEOUT_MS);
    if (this.cleanupTimer && typeof (this.cleanupTimer as any).unref === 'function') {
      (this.cleanupTimer as any).unref();
    }
  }

  /**
   * Chunk a message into BLE-sized pieces
   */
  chunk(data: string, mtu: number = DEFAULT_MTU): BleChunk[] {
    const messageId = generateMessageId();
    const maxPayloadSize = mtu - CHUNK_HEADER_SIZE;

    if (maxPayloadSize <= 0) {
      throw new BleChunkError(`MTU too small: ${mtu}`);
    }

    const chunks: BleChunk[] = [];
    const totalChunks = Math.ceil(data.length / maxPayloadSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * maxPayloadSize;
      const end = Math.min(start + maxPayloadSize, data.length);
      chunks.push({
        messageId,
        sequenceNumber: i,
        totalChunks,
        payload: data.slice(start, end),
      });
    }

    return chunks;
  }

  /**
   * Receive a chunk and attempt reassembly
   * Returns the complete message if all chunks received, null otherwise
   */
  receiveChunk(chunk: BleChunk): string | null {
    const {messageId, sequenceNumber, totalChunks, payload} = chunk;

    // Validate
    if (sequenceNumber < 0 || sequenceNumber >= totalChunks) {
      throw new BleChunkError(
        `Invalid sequence number: ${sequenceNumber}/${totalChunks}`,
      );
    }

    // Get or create buffer
    let buffer = this.reassemblyBuffers.get(messageId);
    if (!buffer) {
      buffer = {
        messageId,
        totalChunks,
        receivedChunks: new Map(),
        createdAt: Date.now(),
      };
      this.reassemblyBuffers.set(messageId, buffer);
    }

    // Validate total chunks consistency
    if (buffer.totalChunks !== totalChunks) {
      throw new BleChunkError(
        `Chunk count mismatch for ${messageId}: expected ${buffer.totalChunks}, got ${totalChunks}`,
      );
    }

    // Store chunk (ignores duplicates)
    buffer.receivedChunks.set(sequenceNumber, payload);

    // Check if complete
    if (buffer.receivedChunks.size === totalChunks) {
      // Reassemble in order
      let message = '';
      for (let i = 0; i < totalChunks; i++) {
        const chunkPayload = buffer.receivedChunks.get(i);
        if (!chunkPayload) {
          throw new BleChunkError(`Missing chunk ${i} for ${messageId}`);
        }
        message += chunkPayload;
      }

      // Cleanup
      this.reassemblyBuffers.delete(messageId);
      return message;
    }

    return null; // Not yet complete
  }

  /**
   * Serialize a chunk to a JSON string for BLE transmission
   */
  static serializeChunk(chunk: BleChunk): string {
    return JSON.stringify(chunk);
  }

  /**
   * Deserialize a chunk from a JSON string
   */
  static deserializeChunk(data: string): BleChunk {
    try {
      const parsed = JSON.parse(data);
      if (
        typeof parsed.messageId !== 'string' ||
        typeof parsed.sequenceNumber !== 'number' ||
        typeof parsed.totalChunks !== 'number' ||
        typeof parsed.payload !== 'string'
      ) {
        throw new Error('Invalid chunk structure');
      }
      return parsed as BleChunk;
    } catch (error: any) {
      throw new BleChunkError(`Failed to deserialize chunk: ${error.message}`);
    }
  }

  /**
   * Get the number of pending reassembly buffers
   */
  getPendingCount(): number {
    return this.reassemblyBuffers.size;
  }

  /**
   * Clear all reassembly buffers
   */
  clear(): void {
    this.reassemblyBuffers.clear();
  }

  /**
   * Destroy the chunker (cleanup timers)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.reassemblyBuffers.clear();
  }

  // ─── Private ───

  private cleanupStaleBuffers(): void {
    const now = Date.now();
    for (const [id, buffer] of this.reassemblyBuffers) {
      if (now - buffer.createdAt > REASSEMBLY_TIMEOUT_MS) {
        console.warn(
          `[Chunker] Dropping incomplete message ${id} (${buffer.receivedChunks.size}/${buffer.totalChunks} chunks)`,
        );
        this.reassemblyBuffers.delete(id);
      }
    }
  }
}

export default MessageChunker;
