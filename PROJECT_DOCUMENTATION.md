# Bitpay Off-Grid Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Key Services](#key-services)
7. [Data Flow](#data-flow)
8. [Setup & Execution](#setup--execution)
9. [Testing](#testing)
10. [Key Concepts](#key-concepts)
11. [API Reference](#api-reference)

---

## Project Overview

**Bitpay** is a **100% offline-first mobile wallet application** built on React Native that enables **peer-to-peer cryptocurrency transactions over Bluetooth Low Energy (BLE) mesh networks**. The app is designed to work without internet connectivity, allowing users to transfer crypto assets through a self-forming mesh network of nearby devices.

### Key Features

- **Offline-First Architecture**: Works completely without internet using BLE mesh networking
- **HD Wallet Management**: Create or import wallets using BIP-39 mnemonic phrases
- **Peer-to-Peer Transfers**: Send crypto to other devices via BLE mesh
- **Local Ledger**: Maintains a distributed ledger of transactions with vector clocks for causal ordering
- **Deferred Settlement**: Queues transactions for on-chain settlement when internet becomes available (optional)
- **Secure Encryption**: End-to-end encryption for all mesh messages
- **Multi-Screen Onboarding**: Guided wallet creation and import flows

### Use Cases

1. **Remittance in Low-Connectivity Areas**: Transfer money between devices without internet
2. **Disaster Relief**: Enable payments during network outages
3. **Privacy-First Transactions**: All transactions signed locally, private keys never leave device
4. **Community Networks**: Create isolated payment networks among nearby devices

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT NATIVE UI                          │
│   (Navigation, Screens, State Management via Redux)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼────────────┐      ┌──────▼──────────┐
    │  WALLET LAYER   │      │   MESH LAYER    │
    │                 │      │                 │
    │ • WalletService │      │ • GossipProtocol│
    │ • HD Wallet Mgmt│      │ • MeshTopology  │
    │ • SecureStorage │      │ • RelayerDetect │
    │ • Transaction   │      │ • RelayerService│
    │   Signing       │      │                 │
    └────┬────────────┘      └────┬────────────┘
         │                         │
         │    ┌────────────────────┴────────────────────┐
         │    │                                         │
    ┌────▼────────────┐                    ┌───────────▼─────────┐
    │  TRANSACTION     │                    │  BLE SERVICE LAYER  │
    │  LAYER           │                    │                     │
    │                  │                    │ • BleService        │
    │ • TransactionMgr │                    │ • ConnectionManager │
    │ • NonceManager   │                    │ • DeviceDiscovery   │
    │ • TxSerializer   │                    │ • MessageChunker    │
    │                  │                    │                     │
    └────┬─────────────┘                    └───────────┬─────────┘
         │                                              │
         │    ┌────────────────────┬───────────────────┘
         │    │                    │
    ┌────▼────────────┐    ┌───────▼────────┐
    │ SETTLEMENT LAYER│    │ ENCRYPTION     │
    │                 │    │ LAYER           │
    │ • Settlement    │    │                 │
    │   Service       │    │ • Encryption    │
    │ • Backend       │    │   Service       │
    │   Service       │    │ • KeyExchange   │
    │                 │    │                 │
    └─────────────────┘    └─────────────────┘
         │                         │
         └────────────┬───────────┘
                      │
            ┌─────────▼──────────┐
            │ REDUX STORE        │
            │                    │
            │ • walletSlice      │
            │ • meshSlice        │
            │ • transactionSlice │
            │ • ledgerSlice      │
            │ • uiSlice          │
            └────────────────────┘
```

### Core Workflows

#### 1. Wallet Creation/Import Flow
```
User Action
    ↓
WalletService.createWallet() / importWallet()
    ↓
Generate HD Wallet (BIP-39 + ethers.js)
    ↓
SecureStorageService.store() (Secure Enclave/Keychain)
    ↓
Redux Store Update
    ↓
UI Update
```

#### 2. Peer Discovery & Connection Flow
```
Start Mesh
    ↓
BleService.startScan()
    ↓
DeviceDiscoveryService.discoveryDevices
    ↓
Device Found
    ↓
BleService.connectToDevice()
    ↓
GossipProtocol.publish(DISCOVERY)
    ↓
Mesh State Updated
```

#### 3. Transaction & Gossip Flow
```
User Initiates Transfer
    ↓
TransactionManager.createTransfer()
    ↓
Sign with WalletService
    ↓
GossipProtocol.publish(TRANSACTION)
    ↓
MessageChunker.chunk() (if large)
    ↓
BleService.sendData() → Connected Peers
    ↓
Peers Receive & Process
    ↓
LocalLedger.addEntry()
    ↓
Forward to Other Peers (TTL-based gossip)
    ↓
Verify Receipt & Update Balance
```

#### 4. Settlement Flow (When Online)
```
Internet Connection Detected
    ↓
SettlementService.start()
    ↓
Poll: getUnsettled() transactions
    ↓
For Each Transaction:
    - Build ERC-20 transfer payload
    - Sign with WalletService
    - Broadcast via BackendService or direct RPC
    - Wait for confirmation
    - Mark as SETTLED
    ↓
Sync state with on-chain
```

---

## Technology Stack

### Frontend
- **React Native** (0.73.2) - Cross-platform mobile UI
- **React Navigation** (6.x) - Screen navigation (Stack, Tab, Drawer)
- **Redux Toolkit** (2.x) - State management
- **TypeScript** (5.3) - Type safety

### Connectivity
- **react-native-ble-plx** (3.1.2) - BLE scanning, connection, communication
- **React Native Gesture Handler** - Touch gestures
- **React Native Safe Area Context** - Safe area handling

### Crypto & Wallet
- **ethers.js** (6.9.0) - Ethereum/EVM wallet management, signing, RPC
- **react-native-keychain** (8.2.0) - Secure key storage
- **buffer** (6.0.3) - Node.js Buffer polyfill

### UI & Theming
- **react-native-qrcode-svg** (6.3.1) - QR code generation
- **react-native-svg** (14.1.0) - Vector graphics
- **Custom Color Theme** (src/theme/colors.ts)

### Development & Testing
- **Jest** (29.7.0) - Testing framework
- **Babel** - Transpiler
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **ts-jest** - TypeScript support in Jest

---

## Project Structure

```
off-grid/
├── App.tsx                          # App entry point
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── jest.config.js                   # Jest config
├── src/
│   ├── store/                       # Redux slices
│   │   ├── index.ts                 # Store configuration
│   │   ├── walletSlice.ts           # Wallet state
│   │   ├── transactionSlice.ts      # Transaction state
│   │   ├── meshSlice.ts             # Mesh network state
│   │   ├── ledgerSlice.ts           # Local ledger state
│   │   └── uiSlice.ts               # UI state
│   │
│   ├── services/                    # Business logic layer
│   │   ├── wallet/                  # Wallet management
│   │   │   ├── WalletService.ts     # HD wallet creation, import, signing
│   │   │   └── SecureStorageService.ts  # Keychain/Secure enclave
│   │   │
│   │   ├── ble/                     # Bluetooth Low Energy
│   │   │   ├── BleService.ts        # Core BLE abstraction
│   │   │   ├── ConnectionManager.ts # Device connections
│   │   │   ├── DeviceDiscoveryService.ts # Peer discovery
│   │   │   ├── MessageChunker.ts    # Message fragmentation
│   │   │   └── __mocks__/           # Testing mocks
│   │   │
│   │   ├── mesh/                    # P2P mesh networking
│   │   │   ├── GossipProtocol.ts    # Message propagation
│   │   │   ├── MeshTopologyManager.ts # Peer management
│   │   │   └── RelayerDetector.ts   # Detect gateways
│   │   │
│   │   ├── transaction/             # Transaction handling
│   │   │   ├── TransactionManager.ts # Create/sign transfers
│   │   │   ├── TransactionSerializer.ts # Encode/decode
│   │   │   └── NonceManager.ts      # Sequence numbers
│   │   │
│   │   ├── encryption/              # End-to-end encryption
│   │   │   ├── EncryptionService.ts # AES encryption
│   │   │   └── KeyExchangeService.ts # ECDH key exchange
│   │   │
│   │   ├── ledger/                  # Distributed ledger
│   │   │   ├── LocalLedger.ts       # Local transaction log
│   │   │   └── VectorClock.ts       # Causal ordering
│   │   │
│   │   ├── relayer/                 # Optional relayer (for settlement)
│   │   │   ├── RelayerService.ts    # Relayer operations
│   │   │   └── RelayerServiceFactory.ts
│   │   │
│   │   ├── settlement/              # On-chain settlement
│   │   │   ├── SettlementService.ts # Deferred on-chain submission
│   │   │   └── SettlementServiceFactory.ts
│   │   │
│   │   └── backend/                 # Backend API
│   │       └── BackendService.ts    # API endpoints
│   │
│   ├── screens/                     # React Native screens
│   │   ├── onboarding/              # Wallet setup flows
│   │   │   ├── WelcomeScreen.tsx    # Entry point
│   │   │   ├── CreateWalletScreen.tsx
│   │   │   ├── RecoveryPhraseScreen.tsx
│   │   │   ├── VerifyPhraseScreen.tsx
│   │   │   ├── ImportWalletScreen.tsx
│   │   │   └── WalletReadyScreen.tsx
│   │   │
│   │   └── main/                    # Main app screens
│   │       ├── DashboardScreen.tsx  # Balance & overview
│   │       ├── SendScreen.tsx       # Initiate transfers
│   │       ├── ReceiveScreen.tsx    # Show address/QR
│   │       ├── ActivityScreen.tsx   # Transaction history
│   │       ├── SettingsScreen.tsx   # App settings
│   │       └── MeshMapScreen.tsx    # Peer visualization
│   │
│   ├── navigation/                  # React Navigation
│   │   ├── AppNavigator.tsx         # Root navigator
│   │   └── types.ts                 # Navigation types
│   │
│   ├── types/                       # TypeScript interfaces
│   │   ├── wallet.ts                # Wallet state types
│   │   ├── mesh.ts                  # Mesh network types
│   │   ├── transaction.ts           # Transaction types
│   │   ├── ble.ts                   # BLE types
│   │   └── ...
│   │
│   ├── theme/                       # Styling
│   │   └── colors.ts                # Color palette
│   │
│   ├── utils/                       # Utilities
│   │   ├── constants.ts             # Configuration constants
│   │   ├── errors.ts                # Custom error classes
│   │   └── helpers.ts               # Helper functions
│   │
│   └── __tests__/                   # Unit tests
│       ├── WalletService.test.ts
│       ├── TransactionSerializer.test.ts
│       ├── EncryptionService.test.ts
│       ├── LocalLedger.test.ts
│       ├── VectorClock.test.ts
│       └── ...
│
├── backend/                         # (Future) Backend service
└── node_modules/                    # Dependencies
```

---

## Core Components

### 1. **Wallet Service**
**File**: `src/services/wallet/WalletService.ts`

Manages HD wallet lifecycle using ethers.js and BIP-39.

**Key Methods**:
- `createWallet()` - Generate new random wallet with mnemonic
- `importWallet(mnemonic, accountIndex)` - Import from recovery phrase
- `loadWallet()` - Load existing wallet from secure storage
- `getAddress()` - Get current wallet address
- `signTransaction(txRequest)` - Sign EVM transaction
- `signMessage(message)` - Sign arbitrary message
- `getMnemonic()` - Get backup recovery phrase
- `hasWallet()` - Check if wallet exists

**Storage**: Uses `SecureStorageService` to store:
- Private key (encrypted in OS keychain)
- Mnemonic phrase (encrypted)
- Public address

### 2. **BLE Service**
**File**: `src/services/ble/BleService.ts`

Core Bluetooth Low Energy abstraction layer wrapping `react-native-ble-plx`.

**Key Methods**:
- `initialize()` - Enable BLE and check permissions
- `startScan(onDeviceFound, duration)` - Discover nearby devices
- `stopScan()` - Stop scanning
- `connectToDevice(deviceId)` - Establish connection
- `disconnectDevice(deviceId)` - Close connection
- `sendData(deviceId, data)` - Send bytes to device
- `onDataReceived(callback)` - Register data listener
- `getConnectedDeviceIds()` - List connected peers
- `isDeviceConnected(deviceId)` - Check connection status

**Configuration**:
- Service UUID & Characteristic UUIDs (defined in `src/types/ble.ts`)
- Scan duration & connection timeout
- Base64 encoding for data transfer

### 3. **Gossip Protocol**
**File**: `src/services/mesh/GossipProtocol.ts`

Implements message propagation across BLE mesh with TTL-based forwarding.

**Key Methods**:
- `publish(type, payload, senderId)` - Publish new message
- `handleIncoming(rawData, fromDeviceId)` - Process received message
- `onMessage(type, callback)` - Register handler for message type
- `broadcast(message)` - Send to all connected peers
- `forward(message, fromDeviceId)` - Gossip to other peers

**Features**:
- Deduplication (tracks seen message IDs)
- TTL-based expiration (prevents infinite flooding)
- Rate limiting (throttles forwarding)
- Message chunking for large payloads

**Message Types**:
- `TRANSACTION` - Transfer intent
- `RECEIPT` - Bilateral acknowledgment
- `DISCOVERY` - Peer discovery
- `HEARTBEAT` - Keep-alive
- `KEY_EXCHANGE` - ECDH handshake
- `BALANCE_SYNC` - Ledger sync

### 4. **Transaction Manager**
**File**: `src/services/transaction/TransactionManager.ts`

Creates, signs, and manages transfers between peers.

**Key Methods**:
- `createTransfer(to, amount)` - Initiate transfer
- `signAndBroadcast(transfer)` - Sign and publish
- `handleReceipt(receipt)` - Process acknowledgment
- `getTransaction(txId)` - Fetch transaction details

**Transaction States**:
- `PENDING` - Created, waiting to broadcast
- `ANNOUNCED` - Broadcast to mesh
- `CONFIRMED` - Receipt received from counterparty
- `SETTLED` - Confirmed on-chain (optional)

### 5. **Local Ledger**
**File**: `src/services/ledger/LocalLedger.ts`

Maintains a local, distributed ledger of transactions.

**Key Methods**:
- `addEntry(entry)` - Record transaction
- `getBalance(address)` - Calculate current balance
- `getHistory(address)` - Transaction history
- `getUnsettled()` - Transactions pending on-chain settlement
- `markSettled(txId)` - Mark as on-chain settled

**Entry Structure**:
```typescript
interface LedgerEntry {
  txId: string;
  type: 'DEBIT' | 'CREDIT'; // Outgoing or incoming
  from: string;
  to: string;
  amount: string;
  timestamp: number;
  status: 'PENDING' | 'CONFIRMED' | 'SETTLED';
  tokenAddress: string;
}
```

**Consistency**:
- Uses vector clocks for causal ordering
- Tolerates out-of-order arrival
- Computes balance deterministically

### 6. **Settlement Service**
**File**: `src/services/settlement/SettlementService.ts`

Optional service that submits queued transfers to on-chain settlement when internet is available.

**Key Methods**:
- `start(rpcUrl)` - Enable settlement processing
- `stop()` - Disable settlement
- `isActive()` - Check if running
- `processSettlement()` - Poll and submit pending txs

**Workflow**:
1. Polls local ledger for unsettled DEBIT entries
2. Builds proper ERC-20 transfer (encode function call)
3. Signs transaction locally with wallet
4. Submits via:
   - Backend service (preferred)
   - Direct RPC broadcast (fallback)
5. Polls for receipt
6. Marks as SETTLED in local ledger

**Chain Details**:
- Default: Celo testnet
- Default RPC: configurable via `DEFAULT_RPC_URL`
- Token: ERC-20 at `tokenAddress`
- Gas: Pre-configured limits

### 7. **Encryption Service**
**File**: `src/services/encryption/EncryptionService.ts`

End-to-end encryption for all mesh messages.

**Key Methods**:
- `encrypt(plaintext, publicKey)` - Encrypt with peer's key
- `decrypt(ciphertext, privateKey)` - Decrypt with own key
- `generateKeyPair()` - Create ECDH key pair

**Scheme**:
- ECDH for key exchange
- AES-256-GCM for encryption
- HMAC for authentication

---

## Key Services

### Connection Manager
**File**: `src/services/ble/ConnectionManager.ts`

Manages active BLE device connections and queues outgoing messages.

### Device Discovery Service
**File**: `src/services/ble/DeviceDiscoveryService.ts`

Continuous BLE scanning and peer detection with signal strength filtering.

### Message Chunker
**File**: `src/services/ble/MessageChunker.ts`

Fragments large messages into BLE MTU-sized chunks and reassembles on receive.

### Mesh Topology Manager
**File**: `src/services/mesh/MeshTopologyManager.ts`

Tracks peer connectivity, battery levels, and constructs network graph.

### Relayer Detector
**File**: `src/services/mesh/RelayerDetector.ts`

Identifies devices capable of on-chain settlement (gateways with internet).

### Vector Clock
**File**: `src/services/ledger/VectorClock.ts`

Implements Lamport/Vector Clock for causal ordering without centralized timestamp.

### Secure Storage Service
**File**: `src/services/wallet/SecureStorageService.ts`

OS-level secure storage:
- **iOS**: Keychain
- **Android**: Keystore

### Nonce Manager
**File**: `src/services/transaction/NonceManager.ts`

Manages transaction nonce sequences to prevent replay attacks.

### Transaction Serializer
**File**: `src/services/transaction/TransactionSerializer.ts`

Encodes/decodes transactions to JSON for mesh transport.

---

## Data Flow

### Complete Transaction Flow

```
1. User Initiates Transfer
   └─ SendScreen.tsx → Redux dispatch → transactionSlice

2. TransactionManager Creates Transfer
   └─ generateTxId()
   └─ sign with WalletService
   └─ Create signed payload

3. GossipProtocol Publishes
   └─ Create MeshMessage (type: TRANSACTION)
   └─ Mark as "seen" (dedup)
   └─ Call broadcast()

4. BleService Sends
   └─ For each connected peer:
     └─ MessageChunker.chunk() if size > MTU
     └─ BleService.sendData() to TX characteristic

5. Peers Receive & Process
   └─ setupDataListener() catches RX characteristic
   └─ Reassemble chunks if needed
   └─ GossipProtocol.handleIncoming()
   └─ Dedup check (skip if seen)
   └─ TTL check (decrement & forward if > 0)
   └─ notifyHandlers() → TransactionManager

6. LocalLedger Records
   └─ TransactionManager calls LocalLedger.addEntry()
   └─ Entry type: CREDIT (incoming)
   └─ Vector clock updates for causal order
   └─ Balance recalculated

7. Acknowledge (Optional Receipt)
   └─ Send back RECEIPT message
   └─ Include entry signature/proof

8. Settlement (If Online)
   └─ SettlementService.processSettlement()
   └─ Build ERC-20 transfer call
   └─ Sign with WalletService
   └─ Broadcast to RPC/Backend
   └─ Poll for receipt
   └─ Mark as SETTLED
   └─ Update on-chain state
```

### State Flow (Redux)

```
walletSlice
├── address: string                    # User's wallet address
├── balance: string                    # Current balance
├── isSetup: boolean                   # Wallet created/imported?
├── mnemonicBackedUp: boolean          # User saved recovery phrase?
└── error: string | null

transactionSlice
├── [txId]: {
│   ├── id: string
│   ├── from: string
│   ├── to: string
│   ├── amount: string
│   ├── status: 'PENDING'|'CONFIRMED'|'SETTLED'
│   ├── timestamp: number
│   └── txHash?: string
└── }

meshSlice
├── peers: Peer[]                      # Connected devices
│   ├── id, deviceId, address, name
│   ├── rssi, role, batteryLevel
│   └── lastSeen, isConnected
├── isScanning: boolean
├── isAdvertising: boolean
├── connectedCount: number
└── selfId: string

ledgerSlice
├── entries: LedgerEntry[]             # All transactions
├── balances: Map<address, balance>    # Cached balances
├── settled: Set<txId>                 # On-chain confirmed
└── vectorClock: VectorClockMap

uiSlice
├── currentScreen: string
├── isLoading: boolean
├── notification: string | null
└── darkMode: boolean
```

---

## Setup & Execution

### Prerequisites

- **Node.js** 16+ & npm/yarn
- **React Native CLI**
- **Xcode** (iOS) or **Android Studio** (Android)
- **Celo Testnet Account** (optional, for settlement testing)

### Installation

```bash
# 1. Install dependencies
npm install
# or
yarn install

# 2. Install pods (iOS only)
cd ios && pod install && cd ..
```

### Running on Android

```bash
# Start the Metro bundler
npm start

# In another terminal, run on device/emulator
npm run android

# Or manually:
react-native run-android
```

### Running on iOS

```bash
# Start the Metro bundler
npm start

# In another terminal, run on device/simulator
npm run ios

# Or manually:
react-native run-ios
```

### Metro Bundler

The bundler runs on `http://localhost:8081` and serves JavaScript to the app.

**Common Issues**:
- Port 8081 already in use: `npm start -- --port 8082`
- Clear cache: `npm start -- --reset-cache`

### Environment Variables

Create `.env` (if needed):
```
DEFAULT_RPC_URL=https://alfajores-forno.celo-testnet.org
DEFAULT_CHAIN_ID=44787
CHAIN_NAME=Celo Alfajores Testnet
```

Currently hardcoded in `src/utils/constants.ts` — modify as needed.

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Test specific file
npm test -- WalletService.test.ts
```

**Test Files**:
- `src/__tests__/WalletService.test.ts` - Wallet creation, import, signing
- `src/__tests__/EncryptionService.test.ts` - Encryption/decryption
- `src/__tests__/TransactionSerializer.test.ts` - TX encoding
- `src/__tests__/MessageChunker.test.ts` - Message fragmentation
- `src/__tests__/VectorClock.test.ts` - Causal ordering
- `src/__tests__/LocalLedger.test.ts` - Ledger operations
- `src/__tests__/NonceManager.test.ts` - Nonce sequences
- `src/__tests__/GossipProtocol.test.ts` - Message propagation

### Linting

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

---

## Testing

### Test Structure

Tests use **Jest** with **ts-jest** for TypeScript support.

```typescript
// Example test
describe('WalletService', () => {
  it('should create a new wallet', async () => {
    const wallet = new WalletService();
    const result = await wallet.createWallet();

    expect(result.address).toBeDefined();
    expect(result.mnemonic).toMatch(/^\w+(\s+\w+){11}$/); // 12-word phrase
    expect(result.privateKey).toBeDefined();
  });
});
```

### Mocking

**Mocked modules** (defined in `jest` config in `package.json`):
- `react-native-ble-plx` → `src/services/ble/__mocks__/react-native-ble-plx.ts`
- `react-native-keychain` → `src/services/wallet/__mocks__/react-native-keychain.ts`

This allows tests to run without actual BLE hardware or secure storage.

---

## Key Concepts

### 1. **100% Offline Architecture**
- No internet required for p2p transfers
- Mesh network forms ad-hoc among nearby BLE devices
- Settlement to on-chain is **optional** and deferred

### 2. **BLE Mesh Networking**
- Each device acts as both client and relay
- TTL-based message forwarding prevents infinite loops
- No central gateway required (though devices can act as relayers)
- **Service UUID** identifies the Bitpay service
- Two characteristics: TX (write) and RX (notify/read)

### 3. **Vector Clocks for Causal Ordering**
- Ensures transactions are ordered consistently across peers
- Each peer increments its own logical clock on each event
- Message includes clocks of all peers to track causality
- Prevents conflicting orderings when network partitions heal

### 4. **HD Wallets (BIP-39)**
- 12-word recovery phrase generates deterministic key hierarchy
- Standard Ethereum derivation path: `m/44'/60'/0'/0/0`
- Can derive multiple accounts from single mnemonic
- Private key stored in OS keychain (encrypted)

### 5. **Deferred Settlement Model**
- Transactions occur **fully offline** in local ledger
- When device gets internet, `SettlementService` submits them
- On-chain transaction = proof of off-chain agreement
- Counterparty independently broadcasts same transfer when online
- Handles double-spend prevention at settlement time

### 6. **Message Chunking**
- BLE MTU (Maximum Transmission Unit) is typically 512 bytes
- Large messages (transactions, mesh routing) split into chunks
- Receiver reassembles and validates completeness
- Prevents message loss due to size limits

### 7. **Secure Enclave Storage**
- Private key never in plaintext in app code
- Stored encrypted in OS keychain
- Signing happens in secure context (private key never read to app)
- Recovery phrase also encrypted (user should back up separately)

### 8. **Gossip Protocol**
- Each node forwards messages it hasn't seen
- TTL prevents flooding
- Deduplication cache prevents replay
- Eventually reaches all reachable nodes (if paths exist)

---

## API Reference

### Redux Hooks

```typescript
import { useAppDispatch, useAppSelector } from './src/store';

// Get state
const wallet = useAppSelector(state => state.wallet);
const peers = useAppSelector(state => state.mesh.peers);

// Dispatch actions
const dispatch = useAppDispatch();
dispatch(updateWallet({ address: '0x...' }));
```

### Key Service Instantiation

```typescript
// All services use singleton pattern
import WalletService from './src/services/wallet/WalletService';
import BleService from './src/services/ble/BleService';
import GossipProtocol from './src/services/mesh/GossipProtocol';
import TransactionManager from './src/services/transaction/TransactionManager';
import SettlementService from './src/services/settlement/SettlementService';
import LocalLedger from './src/services/ledger/LocalLedger';

const walletService = WalletService.getInstance();
const bleService = BleService.getInstance();
// ... etc
```

### Configuration Constants

**File**: `src/utils/constants.ts`

Key constants:
- `BLE_SERVICE_UUID` - Custom service UUID for Bitpay
- `DEFAULT_RPC_URL` - Blockchain RPC endpoint
- `DEFAULT_CHAIN_ID` - Celo chain ID (44787 testnet)
- `DEFAULT_TOKEN_DECIMALS` - ERC-20 decimals (18)
- `MAX_FEE_PER_GAS_GWEI` - Gas price limit
- `SETTLEMENT_INTERVAL_MS` - How often to try settlement (30s)

### Error Classes

**File**: `src/utils/errors.ts`

```typescript
new WalletCreationError(message)
new WalletImportError(message)
new BleConnectionError(message)
new BleScanError(message)
new GossipError(message)
new TransactionError(message)
new EncryptionError(message)
// ... etc
```

### Type Definitions

**Core types** (all in `src/types/`):

```typescript
// Wallet
interface WalletState {
  address: string;
  balance: string;
  isSetup: boolean;
  mnemonicBackedUp: boolean;
  error: string | null;
}

// Mesh
interface Peer {
  id: string;
  deviceId: string;
  address: string;
  name: string;
  rssi: number;
  role: PeerRole;
  batteryLevel: number;
  lastSeen: number;
  isConnected: boolean;
}

interface MeshMessage {
  messageId: string;
  type: MeshMessageType;
  payload: string;
  senderId: string;
  originId: string;
  timestamp: number;
  ttl: number;
  hopCount: number;
  vectorClock?: VectorClockMap;
}

// Transaction
enum TransactionStatus {
  PENDING = 'PENDING',
  ANNOUNCED = 'ANNOUNCED',
  CONFIRMED = 'CONFIRMED',
  SETTLED = 'SETTLED',
}

// BLE
interface BleDeviceInfo {
  id: string;
  name: string | null;
  rssi: number;
  serviceUUIDs: string[];
}
```

---

## Common Workflows

### Create a New Wallet

```typescript
import WalletService from './src/services/wallet/WalletService';

const walletService = WalletService.getInstance();

try {
  const result = await walletService.createWallet();
  console.log('Address:', result.address);
  console.log('Recovery Phrase:', result.mnemonic);
  // Display mnemonic to user for backup
} catch (error) {
  console.error('Wallet creation failed:', error);
}
```

### Import Existing Wallet

```typescript
const mnemonic = 'word1 word2 ... word12';
const result = await walletService.importWallet(mnemonic);
console.log('Imported address:', result.address);
```

### Scan for Nearby Devices

```typescript
import BleService from './src/services/ble/BleService';

const bleService = BleService.getInstance();
await bleService.initialize();

await bleService.startScan(
  (device) => {
    console.log('Found device:', device.name, device.rssi);
  },
  5000 // 5 second scan
);
```

### Send a Transfer

```typescript
import TransactionManager from './src/services/transaction/TransactionManager';

const txManager = TransactionManager.getInstance();

const transfer = await txManager.createTransfer(
  '0xRecipientAddress',
  '10.5' // Amount in tokens
);

await txManager.signAndBroadcast(transfer);
```

### Enable Settlement

```typescript
import SettlementService from './src/services/settlement/SettlementService';

const settlementService = SettlementService.getInstance();
settlementService.start(); // Start polling for online settlement

// Later, when done:
settlementService.stop();
```

### Listen to Mesh Messages

```typescript
import GossipProtocol from './src/services/mesh/GossipProtocol';
import { MeshMessageType } from './src/types/mesh';

const gossip = GossipProtocol.getInstance();

gossip.onMessage(MeshMessageType.TRANSACTION, (message) => {
  console.log('Received transaction:', message);
});
```

---

## Future Enhancements

1. **Multi-hop Relaying** - Extend range beyond direct BLE connections
2. **Channel Formation** - Multi-sig channels for faster settlements
3. **Cross-Chain Bridges** - Support multiple blockchains
4. **Offline State Channels** - Extended credit lines between known peers
5. **WebRTC Fallback** - Internet-based gossip for when BLE unavailable
6. **DAO Governance** - Decentralized settlement relayer incentives
7. **Mobile Wallet Integration** - Export keys to MetaMask, etc.

---

## Troubleshooting

### BLE Not Working
- Check permissions (iOS: Privacy → Bluetooth)
- Ensure "Bitpay" BLE service is being advertised
- Verify other device is in range and not already connected

### Settlement Fails
- Check RPC endpoint is accessible
- Verify wallet has sufficient funds for gas
- Check nonce hasn't been replayed elsewhere
- Inspect BackendService logs

### Ledger Balance Mismatch
- Clear local ledger and resync from peers
- Verify vector clocks are consistent
- Check for transaction duplication

### Tests Failing
- Clear Jest cache: `npm test -- --clearCache`
- Verify mock modules are loaded: check `jest.config` moduleNameMapper
- Check TypeScript compilation: `npx tsc --noEmit`

---

## Support & Contributing

For issues, please:
1. Check existing GitHub issues
2. Provide logs and error messages
3. Test on both iOS and Android
4. Include reproduction steps

---

**Last Updated**: March 2026
**Version**: 1.0.0
