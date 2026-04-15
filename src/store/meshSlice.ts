// Mesh Redux Slice — 100% offline mesh, all peers equal

import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
  Peer,
  PeerRole,
  MeshState,
  INITIAL_MESH_STATE,
} from '../types/mesh';

export const meshSlice = createSlice({
  name: 'mesh',
  initialState: INITIAL_MESH_STATE,
  reducers: {
    setSelfId: (state, action: PayloadAction<string>) => {
      state.selfId = action.payload;
    },

    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },

    addPeer: (state, action: PayloadAction<Peer>) => {
      const existingIdx = state.peers.findIndex(
        p => p.deviceId === action.payload.deviceId,
      );
      if (existingIdx !== -1) {
        state.peers[existingIdx] = {
          ...state.peers[existingIdx],
          ...action.payload,
          lastSeen: Date.now(),
        };
      } else {
        state.peers.push({...action.payload, lastSeen: Date.now()});
      }
      state.connectedCount = state.peers.filter(p => p.isConnected).length;
    },

    removePeer: (state, action: PayloadAction<string>) => {
      state.peers = state.peers.filter(p => p.deviceId !== action.payload);
      state.connectedCount = state.peers.filter(p => p.isConnected).length;
    },

    updatePeerConnection: (
      state,
      action: PayloadAction<{deviceId: string; isConnected: boolean}>,
    ) => {
      const peer = state.peers.find(
        p => p.deviceId === action.payload.deviceId,
      );
      if (peer) {
        peer.isConnected = action.payload.isConnected;
        peer.lastSeen = Date.now();
      }
      state.connectedCount = state.peers.filter(p => p.isConnected).length;
    },

    setScanningStatus: (state, action: PayloadAction<boolean>) => {
      state.isScanning = action.payload;
    },

    setAdvertisingStatus: (state, action: PayloadAction<boolean>) => {
      state.isAdvertising = action.payload;
    },

    removeStale: (state, action: PayloadAction<number>) => {
      const timeout = action.payload;
      const now = Date.now();
      state.peers = state.peers.filter(p => now - p.lastSeen < timeout);
      state.connectedCount = state.peers.filter(p => p.isConnected).length;
    },

    clearMesh: () => INITIAL_MESH_STATE,
  },
});

export const {
  setSelfId,
  setInitialized,
  addPeer,
  removePeer,
  updatePeerConnection,
  setScanningStatus,
  setAdvertisingStatus,
  removeStale,
  clearMesh,
} = meshSlice.actions;

// Selectors
export const selectPeers = (state: {mesh: MeshState}) => state.mesh.peers;
export const selectConnectedPeers = (state: {mesh: MeshState}) =>
  state.mesh.peers.filter(p => p.isConnected);
export const selectIsScanning = (state: {mesh: MeshState}) =>
  state.mesh.isScanning;
export const selectConnectedCount = (state: {mesh: MeshState}) =>
  state.mesh.connectedCount;

export default meshSlice.reducer;
