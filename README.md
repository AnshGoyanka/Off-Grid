# Off-Grid

Resilient, offline-first peer-to-peer payments over BLE mesh with Algorand-backed settlement.

Off-Grid is a React Native + TypeScript system designed for high-friction environments where internet-first fintech fails. Devices exchange signed payment intents locally over Bluetooth Low Energy (BLE), maintain a local ledger for continuity, and optionally settle to Algorand TestNet once connectivity is available.

## Executive Summary

This project targets a real operational gap: value transfer should not stop when connectivity drops.

In disaster zones, rural corridors, large public events, and intermittent infrastructure regions, users still need to transact. Off-Grid demonstrates a practical architecture where:

- Transfer intent is created and verified locally
- Mesh propagation happens without centralized coordination
- Settlement is deferred, explicit, and auditable

Design principle: local execution first, network finality second.

## Problem Statement

Most digital payments couple three independent concerns into a single online dependency:

- Discovery and communication
- Authorization and signing
- Settlement and finality

When the network is unstable, the entire flow collapses. Off-Grid decouples these concerns so users can still execute high-confidence local transfers, then finalize on-chain when a gateway regains internet.

## Why This Matters in the Real World

- Field operations: responders and coordinators in infrastructure-stressed areas
- Mobility-heavy communities: temporary markets, transit corridors, event clusters
- Last-mile financial inclusion: low-connectivity environments with smartphone penetration

The value proposition is not theoretical decentralization. It is operational continuity.

## Hackathon Scope and Outcome

This repository intentionally optimizes for a high-credibility MVP:

- End-to-end offline payment workflow on mobile
- Algorand TestNet settlement integration through backend relay
- Deterministic API surface for health, balance, settlement, and tx status
- Automated test coverage for core services and backend routes

This is a production-minded prototype, not a slideware demo.

## Key Capabilities

- Offline peer-to-peer payment messaging via BLE
- Gossip mesh propagation with TTL and dedup controls
- Local ledger and transaction lifecycle tracking
- Wallet creation/import and on-device key handling
- Optional backend-assisted Algorand settlement
- Faucet and transaction status utilities for testnet workflows

## System Architecture

```text
 Mobile App (React Native)
  ├─ UI + Navigation + Redux Store
  ├─ Wallet Service (create/import/sign)
  ├─ BLE Transport + Message Chunker
  ├─ Mesh Gossip + Topology Management
  ├─ Local Ledger + Sequence Helpers
  └─ Settlement Service (invokes backend when online)

 Backend (Node.js + Express + TypeScript)
  ├─ /api/health   (service + chain liveness)
  ├─ /api/balance  (on-chain account balance)
  ├─ /api/settle   (signed relay or backend-signed mode)
  ├─ /api/tx       (confirmation tracking)
  ├─ /api/nonce    (sequence compatibility helper)
  └─ /api/faucet   (funding helper for testnet)

 Chain Layer
  └─ Algorand TestNet (Algod + Indexer)
```

## Technical Decisions

- BLE mesh over internet messaging:
  enables strictly local communication path for transfer intent propagation.
- Deferred settlement model:
  preserves UX continuity offline while retaining on-chain auditability.
- Compatibility endpoints in backend:
  allows mobile iteration speed without breaking core app flows.
- Rate-limited relay endpoints:
  reduces abuse surface in public test environments.

## Tech Stack

- Mobile: React Native 0.73, TypeScript, Redux Toolkit
- Connectivity: react-native-ble-plx
- Chain SDK: algosdk
- Backend: Express, TypeScript, CORS, express-rate-limit
- Testing: Jest + ts-jest (app and backend)

## Repository Layout

```text
.
├─ src/                    # React Native application
│  ├─ screens/             # Onboarding and main UX surfaces
│  ├─ services/            # Wallet, BLE, mesh, ledger, settlement, backend client
│  ├─ store/               # Redux state slices
│  ├─ types/               # Domain contracts
│  └─ utils/               # Constants and helpers
├─ backend/                # Express relay and chain integration
│  ├─ src/routes/          # HTTP route handlers
│  ├─ src/config.ts        # Environment-backed config
│  └─ __tests__/           # Route and integration tests
├─ android/                # Android native project
├─ ios/                    # iOS native project
└─ patches/                # patch-package persistence fixes
```

## Quick Start

### 1) Install dependencies

```bash
npm install
cd backend
npm install
cd ..
```

### 2) Configure backend

```bash
cd backend
copy .env.example .env
cd ..
```

Minimum required variables:

- ALGORAND_ALGOD_URL
- ALGORAND_INDEXER_URL
- ALGORAND_SETTLER_MNEMONIC (required for backend-signed settlement mode)

### 3) Run backend

```bash
cd backend
npm run dev
```

Default: http://localhost:3000

### 4) Run mobile app

Terminal A:

```bash
npm start
```

Terminal B:

```bash
npm run android
```

or

```bash
npm run ios
```

## API Surface

Base URL: http://localhost:3000

### GET /api/health

Returns backend uptime and Algorand liveness metadata.

### GET /api/balance/:address

Returns ALGO balance and compatibility fields used by existing app UI.

### POST /api/settle

Settlement relay with two operating modes:

- Pre-signed relay

```json
{
  "signedTx": "<base64-signed-transaction>"
}
```

- Backend-signed MVP mode

```json
{
  "to": "<algorand-address>",
  "amount": "0.25"
}
```

### GET /api/tx/:hash

Checks chain status: pending, confirmed, or not_found.

### GET /api/nonce/:address

Sequence compatibility endpoint for mobile flow support.

### POST /api/faucet

```json
{
  "address": "<algorand-address>"
}
```

Uses configured mnemonic-based faucet flow, or returns external faucet guidance.

## Demo Narrative for Judges

1. Provision two devices with wallets.
2. Discover peer over BLE in a no-internet scenario.
3. Execute transfer intent and verify local ledger state transition.
4. Reintroduce connectivity and call settlement.
5. Show immutable finality using transaction status endpoint.

This sequence demonstrates continuity, resilience, and settlement integrity in one pass.

## Engineering Quality

Run app tests:

```bash
npm test
```

Run backend tests:

```bash
cd backend
npm test
```

Optional linting:

```bash
npm run lint
cd backend
npm run lint
```

## Security and Operational Posture

- Mnemonics are environment-configured and must not be committed
- Relay endpoints are rate-limited to reduce abuse risk
- Testnet-only defaults are intentionally isolated from production funds
- Local key custody remains on-device by design

## Current Maturity

This is a serious hackathon build with real architectural intent.

Production-hardening work that would follow:

- Stronger adversarial model and anti-double-spend policy in prolonged offline partitions
- Identity, attestation, and trust scoring for mesh peers
- Settlement queue durability and replay controls across app restarts
- Advanced observability and SLO-backed backend operations

## Supporting Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)
- [EXECUTION_GUIDE.md](EXECUTION_GUIDE.md)

## License

Add a license file before formal open-source publication.