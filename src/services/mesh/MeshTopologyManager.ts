// Mesh Topology Manager — Tracks peer graph and manages heartbeats
// Updated for 100% offline mesh — all peers are equal, no relayer concept

import {Peer, PeerRole, MeshMessageType} from '../../types/mesh';
import {PEER_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS} from '../../types/ble';
import {MAX_PEERS} from '../../utils/constants';
import GossipProtocol from './GossipProtocol';
import {store} from '../../store';
import {addPeer, removePeer, removeStale} from '../../store/meshSlice';

class MeshTopologyManager {
  private static instance: MeshTopologyManager;
  private gossipProtocol: GossipProtocol;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private selfId: string = '';

  private constructor() {
    this.gossipProtocol = GossipProtocol.getInstance();
  }

  static getInstance(): MeshTopologyManager {
    if (!MeshTopologyManager.instance) {
      MeshTopologyManager.instance = new MeshTopologyManager();
    }
    return MeshTopologyManager.instance;
  }

  /**
   * Initialize topology management with our device ID
   */
  initialize(selfId: string): void {
    this.selfId = selfId;

    // Listen for heartbeat messages
    this.gossipProtocol.onMessage(
      MeshMessageType.HEARTBEAT,
      message => {
        try {
          const heartbeat = JSON.parse(message.payload);
          this.handleHeartbeat(message.senderId, heartbeat);
        } catch (e) {
          console.warn('[Topology] Invalid heartbeat payload');
        }
      },
    );

    // Listen for discovery messages
    this.gossipProtocol.onMessage(
      MeshMessageType.DISCOVERY,
      message => {
        try {
          const peerInfo = JSON.parse(message.payload);
          this.handleDiscoveryMessage(peerInfo);
        } catch (e) {
          console.warn('[Topology] Invalid discovery payload');
        }
      },
    );

    // Start sending heartbeats
    this.startHeartbeats();

    // Start stale peer cleanup
    this.startCleanup();
  }

  /**
   * Register a new peer in the topology
   */
  registerPeer(peer: Peer): void {
    const state = store.getState().mesh;
    if (state.peers.length >= MAX_PEERS) {
      console.warn('[Topology] Max peers reached, ignoring new peer');
      return;
    }
    store.dispatch(addPeer(peer));
  }

  /**
   * Remove a peer from the topology
   */
  deregisterPeer(deviceId: string): void {
    store.dispatch(removePeer(deviceId));
  }

  /**
   * Broadcast our presence to the mesh
   */
  async announcePresence(walletAddress: string): Promise<void> {
    const payload = JSON.stringify({
      deviceId: this.selfId,
      address: walletAddress,
      role: PeerRole.PEER, // All peers are equal in offline mesh
      timestamp: Date.now(),
    });

    await this.gossipProtocol.publish(
      MeshMessageType.DISCOVERY,
      payload,
      this.selfId,
    );
  }

  /**
   * Stop all topology management
   */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ─── Private ───

  private startHeartbeats(): void {
    this.heartbeatTimer = setInterval(async () => {
      const payload = JSON.stringify({
        batteryLevel: 100, // TODO: get actual battery level
        peerCount: store.getState().mesh.connectedCount,
        timestamp: Date.now(),
      });

      try {
        await this.gossipProtocol.publish(
          MeshMessageType.HEARTBEAT,
          payload,
          this.selfId,
        );
      } catch (e: any) {
        console.warn('[Topology] Failed to send heartbeat:', e.message);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      store.dispatch(removeStale(PEER_TIMEOUT_MS));
    }, PEER_TIMEOUT_MS / 3);
  }

  private handleHeartbeat(
    senderId: string,
    heartbeat: {batteryLevel: number; peerCount: number},
  ): void {
    const peers = store.getState().mesh.peers;
    const peer = peers.find(p => p.id === senderId || p.deviceId === senderId);
    if (peer) {
      store.dispatch(
        addPeer({
          ...peer,
          batteryLevel: heartbeat.batteryLevel,
          lastSeen: Date.now(),
        }),
      );
    }
  }

  private handleDiscoveryMessage(peerInfo: {
    deviceId: string;
    address: string;
    role: PeerRole;
  }): void {
    const peer: Peer = {
      id: peerInfo.deviceId,
      deviceId: peerInfo.deviceId,
      address: peerInfo.address,
      name: `Peer-${peerInfo.deviceId.slice(-4)}`,
      rssi: -50,
      role: peerInfo.role || PeerRole.PEER,
      batteryLevel: 100,
      lastSeen: Date.now(),
      isConnected: true,
    };
    this.registerPeer(peer);
  }
}

export default MeshTopologyManager;
