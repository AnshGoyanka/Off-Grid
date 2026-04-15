// Gossip Protocol — Transaction propagation across the BLE mesh
// Implements TTL-based forwarding with deduplication to prevent flooding

import {MeshMessage, MeshMessageType} from '../../types/mesh';
import {DEFAULT_TTL, MAX_SEEN_TX_CACHE, GOSSIP_RATE_LIMIT_MS} from '../../utils/constants';
import {GossipError} from '../../utils/errors';
import {generateMessageId} from '../../utils/helpers';
import ConnectionManager from '../ble/ConnectionManager';
import MessageChunker from '../ble/MessageChunker';

export type MessageReceivedCallback = (message: MeshMessage) => void;

class GossipProtocol {
  private static instance: GossipProtocol;
  private connectionManager: ConnectionManager;
  private messageChunker: MessageChunker;
  private seenMessages: Set<string> = new Set();
  private messageCallbacks: Map<MeshMessageType, MessageReceivedCallback[]> = new Map();
  private lastForwardTime: number = 0;

  private constructor() {
    this.connectionManager = ConnectionManager.getInstance();
    this.messageChunker = new MessageChunker();
  }

  static getInstance(): GossipProtocol {
    if (!GossipProtocol.instance) {
      GossipProtocol.instance = new GossipProtocol();
    }
    return GossipProtocol.instance;
  }

  /**
   * Publish a new message to the mesh
   */
  async publish(
    type: MeshMessageType,
    payload: string,
    senderId: string,
  ): Promise<MeshMessage> {
    const message: MeshMessage = {
      messageId: generateMessageId(),
      type,
      payload,
      senderId,
      originId: senderId,
      timestamp: Date.now(),
      ttl: DEFAULT_TTL,
      hopCount: 0,
    };

    // Mark as seen so we don't process our own message
    this.seenMessages.add(message.messageId);
    this.trimSeenCache();

    // Broadcast to all connected peers
    await this.broadcast(message);

    return message;
  }

  /**
   * Handle an incoming message from a peer
   */
  async handleIncoming(rawData: string, fromDeviceId: string): Promise<void> {
    let message: MeshMessage;

    try {
      message = JSON.parse(rawData) as MeshMessage;
    } catch {
      throw new GossipError('Invalid message format');
    }

    // Dedup check
    if (this.seenMessages.has(message.messageId)) {
      return; // Already processed
    }

    // TTL check
    if (message.ttl <= 0) {
      return; // Expired
    }

    // Mark as seen
    this.seenMessages.add(message.messageId);
    this.trimSeenCache();

    // Notify local handlers
    this.notifyHandlers(message);

    // Forward to other peers (gossip)
    await this.forward(message, fromDeviceId);
  }

  /**
   * Register a handler for a specific message type
   */
  onMessage(
    type: MeshMessageType,
    callback: MessageReceivedCallback,
  ): () => void {
    if (!this.messageCallbacks.has(type)) {
      this.messageCallbacks.set(type, []);
    }
    this.messageCallbacks.get(type)!.push(callback);

    return () => {
      const callbacks = this.messageCallbacks.get(type);
      if (callbacks) {
        this.messageCallbacks.set(
          type,
          callbacks.filter(cb => cb !== callback),
        );
      }
    };
  }

  /**
   * Check if a message has been seen
   */
  hasSeen(messageId: string): boolean {
    return this.seenMessages.has(messageId);
  }

  /**
   * Clear the seen cache
   */
  clearSeenCache(): void {
    this.seenMessages.clear();
  }

  /**
   * Get the number of seen messages
   */
  getSeenCount(): number {
    return this.seenMessages.size;
  }

  // ─── Private ───

  private async broadcast(message: MeshMessage): Promise<void> {
    const serialized = JSON.stringify(message);

    // Use chunker if message is large
    const chunks = this.messageChunker.chunk(serialized);
    if (chunks.length === 1) {
      // Small enough to send directly
      await this.connectionManager.broadcastToAll(serialized);
    } else {
      // Send chunks sequentially
      for (const chunk of chunks) {
        const chunkData = MessageChunker.serializeChunk(chunk);
        await this.connectionManager.broadcastToAll(chunkData);
      }
    }
  }

  private async forward(
    message: MeshMessage,
    excludeDeviceId: string,
  ): Promise<void> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastForwardTime < GOSSIP_RATE_LIMIT_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, GOSSIP_RATE_LIMIT_MS - (now - this.lastForwardTime)),
      );
    }
    this.lastForwardTime = Date.now();

    // Decrement TTL and increment hop count
    const forwardedMessage: MeshMessage = {
      ...message,
      ttl: message.ttl - 1,
      hopCount: message.hopCount + 1,
    };

    if (forwardedMessage.ttl <= 0) return;

    const serialized = JSON.stringify(forwardedMessage);
    const connectedIds = this.connectionManager.getConnectedDeviceIds();
    const targets = connectedIds.filter(id => id !== excludeDeviceId);

    await Promise.allSettled(
      targets.map(id =>
        this.connectionManager.sendToDevice(id, serialized),
      ),
    );
  }

  private notifyHandlers(message: MeshMessage): void {
    const handlers = this.messageCallbacks.get(message.type);
    if (handlers) {
      handlers.forEach(cb => cb(message));
    }
  }

  private trimSeenCache(): void {
    if (this.seenMessages.size > MAX_SEEN_TX_CACHE) {
      const entries = Array.from(this.seenMessages);
      const toRemove = entries.slice(
        0,
        entries.length - MAX_SEEN_TX_CACHE,
      );
      toRemove.forEach(id => this.seenMessages.delete(id));
    }
  }
}

export default GossipProtocol;
