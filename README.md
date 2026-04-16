# Off-Grid

Resilient, offline-first peer-to-peer payments over BLE mesh with Algorand-backed settlement.

![Platform](https://img.shields.io/badge/platform-React%20Native-20232a?logo=react)
![Chain](https://img.shields.io/badge/chain-Algorand%20TestNet-000000)
![Architecture](https://img.shields.io/badge/architecture-Offline--First-0a7ea4)
![Backend](https://img.shields.io/badge/backend-Express%20TypeScript-2d6a4f)
![Status](https://img.shields.io/badge/status-Hackathon%20MVP-f4a261)

Off-Grid is a React Native + TypeScript system designed for high-friction environments where connectivity-dependent payment rails fail. Devices exchange signed payment intents locally over Bluetooth Low Energy (BLE), maintain a local ledger for continuity, and optionally settle to Algorand TestNet once connectivity is restored.

## 30-Second Pitch

Off-Grid is a payments continuity layer for environments where internet access cannot be assumed. Instead of blocking transactions when connectivity drops, the system executes signed transfer intent over BLE mesh, records deterministic local state transitions, and defers settlement to Algorand when a gateway reconnects. The result is a practical architecture for resilient commerce, not a connectivity-bound demo.

## Judge Snapshot

- Problem: digital payments fail hard in low-connectivity environments
- Approach: decouple local intent execution from network settlement finality
- Build: mobile mesh client + relay backend + Algorand settlement path
- Outcome: demonstrable end-to-end offline-to-online transaction lifecycle
- Maturity: hackathon MVP built with production-style design boundaries

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

This repository intentionally optimizes for a high-credibility hackathon MVP:

- End-to-end offline payment workflow on mobile
- Algorand TestNet settlement integration through backend relay
- Deterministic API surface for health, balance, settlement, and tx status
- Automated test coverage for core services and backend routes

This is a production-minded prototype, not a slideware demo.

## Real-World Deployment Thesis

Off-Grid is designed for operational environments where latency and availability are constrained by physical infrastructure, not application quality. The architecture assumes intermittent links, peer churn, and delayed finality. By treating internet connectivity as an optimization rather than a hard prerequisite, the system better matches real field-network behavior.

Candidate deployment surfaces:

- Emergency logistics and community relief disbursement
- Temporary economic zones such as camps, festivals, and pop-up markets
- Rural merchant ecosystems with periodic backhaul availability

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

- BLE mesh over internet messaging enables a strictly local communication path for transfer intent propagation.
- The deferred settlement model preserves user continuity offline while retaining on-chain auditability.
- Compatibility endpoints in the backend improve mobile iteration speed without breaking core app flows.
- Rate-limited relay endpoints reduce abuse surface in public test environments.

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

This sequence demonstrates continuity, resilience, and verifiable settlement finality in one pass.

## Why This Is Defensible

The project is defensible because it is not just a wallet UI on a testnet. It combines multiple hard constraints into one coherent system:

- Offline transport and peer discovery on commodity mobile hardware
- Deterministic local state transitions under asynchronous mesh propagation
- Explicit separation of intent execution from settlement finality
- Chain-integrated verification endpoints for post-connectivity auditability
- Practical backend controls such as rate limiting and operational safety defaults

In other words, the defensibility comes from architecture and execution discipline, not from any single SDK integration.

## Metrics to Report in Demo

For demo-day credibility, capture and present these measurements:

- Time to first peer discovery in a two-device setup
- Median local transfer acknowledgment latency
- Settlement confirmation time from reconnect to confirmed status
- End-to-end success rate across repeated offline transfer cycles

These metrics make evaluation objective and communicate engineering maturity.

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