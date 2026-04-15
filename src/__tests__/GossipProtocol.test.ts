/**
 * GossipProtocol tests
 * BleService/ConnectionManager use the mocked react-native-ble-plx.
 * No actual BLE hardware is needed — no peers are connected so broadcasts
 * are no-ops. We test message creation, dedup, TTL, and handler dispatch.
 */
import GossipProtocol from '../services/mesh/GossipProtocol';
import ConnectionManager from '../services/ble/ConnectionManager';
import {MeshMessage, MeshMessageType} from '../types/mesh';
import {GossipError} from '../utils/errors';
import {DEFAULT_TTL} from '../utils/constants';

// Reset singletons between tests
beforeEach(() => {
  (GossipProtocol as any).instance = undefined;
  (ConnectionManager as any).instance = undefined;
  // BleService singleton is loaded lazily — also reset
  const BleService = require('../services/ble/BleService').default;
  (BleService as any).instance = undefined;
});

describe('GossipProtocol', () => {
  // ─── Singleton ─────────────────────────────────────────────────

  it('getInstance returns the same instance', () => {
    const a = GossipProtocol.getInstance();
    const b = GossipProtocol.getInstance();
    expect(a).toBe(b);
  });

  // ─── publish ───────────────────────────────────────────────────

  it('publish returns a message with correct fields', async () => {
    const gp = GossipProtocol.getInstance();
    const msg = await gp.publish(
      MeshMessageType.HEARTBEAT,
      'ping',
      'peer-001',
    );

    expect(msg.type).toBe(MeshMessageType.HEARTBEAT);
    expect(msg.payload).toBe('ping');
    expect(msg.senderId).toBe('peer-001');
    expect(msg.originId).toBe('peer-001');
    expect(msg.ttl).toBe(DEFAULT_TTL);
    expect(msg.hopCount).toBe(0);
    expect(typeof msg.messageId).toBe('string');
    expect(msg.messageId.length).toBeGreaterThan(0);
    expect(typeof msg.timestamp).toBe('number');
  });

  it('publish marks its own message as seen (no self-loop)', async () => {
    const gp = GossipProtocol.getInstance();
    const msg = await gp.publish(MeshMessageType.TRANSACTION, '{}', 'me');
    // The published message should already be in the seen set
    expect(gp.hasSeen(msg.messageId)).toBe(true);
  });

  it('each publish produces a unique messageId', async () => {
    const gp = GossipProtocol.getInstance();
    const m1 = await gp.publish(MeshMessageType.HEARTBEAT, 'a', 'peer');
    const m2 = await gp.publish(MeshMessageType.HEARTBEAT, 'b', 'peer');
    expect(m1.messageId).not.toBe(m2.messageId);
  });

  // ─── handleIncoming ────────────────────────────────────────────

  it('handleIncoming calls registered handler for matching type', async () => {
    const gp = GossipProtocol.getInstance();
    const handler = jest.fn();
    gp.onMessage(MeshMessageType.TRANSACTION, handler);

    const incomingMsg: MeshMessage = {
      messageId: 'inc-001',
      type: MeshMessageType.TRANSACTION,
      payload: '{"amount":"5"}',
      senderId: 'peer-x',
      originId: 'peer-x',
      timestamp: Date.now(),
      ttl: 5,
      hopCount: 1,
    };

    await gp.handleIncoming(JSON.stringify(incomingMsg), 'device-abc');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({messageId: 'inc-001'}),
    );
  });

  it('handleIncoming deduplicates — second call with same messageId is ignored', async () => {
    const gp = GossipProtocol.getInstance();
    const handler = jest.fn();
    gp.onMessage(MeshMessageType.HEARTBEAT, handler);

    const msg: MeshMessage = {
      messageId: 'dedup-001',
      type: MeshMessageType.HEARTBEAT,
      payload: 'pong',
      senderId: 'peer-y',
      originId: 'peer-y',
      timestamp: Date.now(),
      ttl: 3,
      hopCount: 0,
    };

    await gp.handleIncoming(JSON.stringify(msg), 'dev-1');
    await gp.handleIncoming(JSON.stringify(msg), 'dev-2'); // duplicate

    expect(handler).toHaveBeenCalledTimes(1); // processed only once
  });

  it('handleIncoming ignores messages with TTL = 0', async () => {
    const gp = GossipProtocol.getInstance();
    const handler = jest.fn();
    gp.onMessage(MeshMessageType.TRANSACTION, handler);

    const expired: MeshMessage = {
      messageId: 'ttl-zero',
      type: MeshMessageType.TRANSACTION,
      payload: '{}',
      senderId: 'peer',
      originId: 'peer',
      timestamp: Date.now(),
      ttl: 0, // expired
      hopCount: 7,
    };

    await gp.handleIncoming(JSON.stringify(expired), 'dev-x');
    expect(handler).not.toHaveBeenCalled();
  });

  it('handleIncoming throws GossipError on malformed JSON', async () => {
    const gp = GossipProtocol.getInstance();
    await expect(
      gp.handleIncoming('not valid json {{{', 'device'),
    ).rejects.toThrow(GossipError);
  });

  // ─── onMessage / handler removal ───────────────────────────────

  it('onMessage returns an unsubscribe function', async () => {
    const gp = GossipProtocol.getInstance();
    const handler = jest.fn();
    const unsubscribe = gp.onMessage(MeshMessageType.HEARTBEAT, handler);

    // Unsubscribe before message arrives
    unsubscribe();

    const msg: MeshMessage = {
      messageId: 'unsub-001',
      type: MeshMessageType.HEARTBEAT,
      payload: 'ping',
      senderId: 'peer',
      originId: 'peer',
      timestamp: Date.now(),
      ttl: 5,
      hopCount: 0,
    };

    await gp.handleIncoming(JSON.stringify(msg), 'dev-1');
    expect(handler).not.toHaveBeenCalled(); // was removed
  });

  it('multiple handlers for the same type are all called', async () => {
    const gp = GossipProtocol.getInstance();
    const h1 = jest.fn();
    const h2 = jest.fn();
    gp.onMessage(MeshMessageType.RECEIPT, h1);
    gp.onMessage(MeshMessageType.RECEIPT, h2);

    const msg: MeshMessage = {
      messageId: 'multi-001',
      type: MeshMessageType.RECEIPT,
      payload: '{}',
      senderId: 'peer',
      originId: 'peer',
      timestamp: Date.now(),
      ttl: 2,
      hopCount: 0,
    };

    await gp.handleIncoming(JSON.stringify(msg), 'dev');
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it('handler for type A is not called when type B message arrives', async () => {
    const gp = GossipProtocol.getInstance();
    const txHandler = jest.fn();
    gp.onMessage(MeshMessageType.TRANSACTION, txHandler);

    const heartbeat: MeshMessage = {
      messageId: 'type-isolation',
      type: MeshMessageType.HEARTBEAT, // different type
      payload: 'ping',
      senderId: 'peer',
      originId: 'peer',
      timestamp: Date.now(),
      ttl: 3,
      hopCount: 0,
    };

    await gp.handleIncoming(JSON.stringify(heartbeat), 'dev');
    expect(txHandler).not.toHaveBeenCalled();
  });

  // ─── clearSeenCache / getSeenCount ─────────────────────────────

  it('getSeenCount tracks the number of seen messages', async () => {
    const gp = GossipProtocol.getInstance();
    expect(gp.getSeenCount()).toBe(0);

    await gp.publish(MeshMessageType.HEARTBEAT, 'a', 'me');
    expect(gp.getSeenCount()).toBe(1);

    await gp.publish(MeshMessageType.HEARTBEAT, 'b', 'me');
    expect(gp.getSeenCount()).toBe(2);
  });

  it('clearSeenCache resets the seen count', async () => {
    const gp = GossipProtocol.getInstance();
    await gp.publish(MeshMessageType.HEARTBEAT, 'x', 'node');
    await gp.publish(MeshMessageType.HEARTBEAT, 'y', 'node');
    expect(gp.getSeenCount()).toBe(2);

    gp.clearSeenCache();
    expect(gp.getSeenCount()).toBe(0);
  });

  it('hasSeen returns false for messages that were never processed', () => {
    const gp = GossipProtocol.getInstance();
    expect(gp.hasSeen('never-seen-id')).toBe(false);
  });
});
