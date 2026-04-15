# Bitpay Architecture Deep Dive

## Table of Contents
1. [System Design](#system-design)
2. [Communication Protocol](#communication-protocol)
3. [Consensus & Ledger](#consensus--ledger)
4. [Security](#security)
5. [Performance Considerations](#performance-considerations)
6. [Scalability](#scalability)
7. [Failure Modes](#failure-modes)

---

## System Design

### Design Principles

1. **Offline-First**: App works without internet; settlement is optional
2. **Peer Equality**: No designated master or authority (except during settlement)
3. **Local Authority**: Private keys stay on device; no key sharing
4. **Eventual Consistency**: Ledger converges across peers
5. **Minimal Assumptions**: Works with unreliable BLE and intermittent connections

### System Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    OFFLINE DOMAIN                           │
│                                                              │
│  • BLE mesh network                                         │
│  • Local ledger in each device                              │
│  • Vector clocks for causality                              │
│  • Fully decentralized (no authority)                       │
│                                                              │
│  Assumption: Peers are semi-trusted (not Byzantine)         │
│                                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Settlement (Optional)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  ON-CHAIN DOMAIN                            │
│                                                              │
│  • Blockchain (Celo, Ethereum, etc.)                       │
│  • ERC-20 token contract                                    │
│  • Nonce tracking for replay prevention                     │
│  • Immutable transaction history                            │
│                                                              │
│  Guarantee: Cryptographic finality                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Trust Model

**Offline Mesh**:
- No cryptographic trust (relies on BLE security)
- Peers track what they've seen
- Can lose consistency if network partitions for long time
- Recovers when partition heals (vector clocks resolve conflicts)

**On-Chain Settlement**:
- Cryptographic finality via blockchain
- Double-spend prevention via nonce
- Immutable record
- Requires internet connectivity

---

## Communication Protocol

### Layer 1: BLE Transport

```
App → BleService → react-native-ble-plx → BLE Radio
                   ↓
            Scan for devices with service UUID
            Connect to device
            Discover services & characteristics
            Setup TX (write) and RX (notify) listeners
```

**Service/Characteristic UUIDs** (defined in `src/types/ble.ts`):
- **Service UUID**: Custom UUID for Bitpay app
- **TX Characteristic**: App → Device (write with response)
- **RX Characteristic**: Device → App (notify/read)

**BLE Limitations**:
- MTU (Max Transmission Unit): ~512 bytes
- Range: ~100 meters (outdoor), ~10 meters (walls)
- Bandwidth: ~1 Mbps

### Layer 2: Message Chunking

For messages > MTU size:

```
Message (e.g., 2000 bytes)
    ↓
MessageChunker.chunk([256-byte chunks])
    ↓
Header (1 byte: flags)
ChunkIndex (1 byte: 0/1/2/...)
TotalChunks (1 byte: 3)
Data (remaining bytes)
    ↓
BleService.sendData() → BLE
    ↓
Receiver → MessageChunker.reassemble()
    ↓
Complete Message
```

**Chunk Header Format**:
```
| Flags | ChunkIndex | TotalChunks | Payload Data |
| 1B    | 1B         | 1B          | N bytes      |
```

**Flags**:
- Bit 0: Start of message
- Bit 1: End of message
- Bit 2: Compressed
- Bits 3-7: Reserved

### Layer 3: Mesh Messaging

```
GossipProtocol.publish()
    ↓
Create MeshMessage:
  {
    messageId: "uuid",
    type: "TRANSACTION" | "RECEIPT" | "HEARTBEAT" | ...,
    payload: JSON.stringify(data),
    senderId: "peer1",
    originId: "peer1",
    timestamp: 1234567890,
    ttl: 5,
    hopCount: 0,
    vectorClock: { peer1: 5, peer2: 3, ... }
  }
    ↓
JSON.stringify()
    ↓
MessageChunker.chunk() if > MTU
    ↓
For each connected peer:
  BleService.sendData(peerId, messageData)
    ↓
Peer receives → handleIncoming()
  ├─ JSON.parse()
  ├─ Dedup check (seen messageId?)
  ├─ TTL check (ttl > 0?)
  ├─ Notify handlers (onMessage callbacks)
  └─ forward(message) to other peers
        └─ Decrement TTL
        └─ Increment hopCount
        └─ Broadcast
```

**Message Type Handlers**:

| Type | Sender | Content | Response |
|------|--------|---------|----------|
| TRANSACTION | Peer A | Transfer intent (signed) | RECEIPT |
| RECEIPT | Peer B | Acknowledgment (signed) | (none) |
| DISCOVERY | Any | Peer intro (address, name) | (none) |
| HEARTBEAT | Any | Keep-alive beacon | (none) |
| KEY_EXCHANGE | Peer A | ECDH public key | KEY_EXCHANGE back |
| BALANCE_SYNC | Any | Ledger state dump | (none) |

### Layer 4: Application Messages

#### Transaction Message

```json
{
  "messageId": "msg_abc123",
  "type": "TRANSACTION",
  "payload": "{
    \"txId\": \"tx_def456\",
    \"from\": \"0xAlice\",
    \"to\": \"0xBob\",
    \"amount\": \"10.5\",
    \"tokenAddress\": \"0xToken\",
    \"nonce\": 5,
    \"timestamp\": 1234567890,
    \"signature\": \"0xSig...\"
  }",
  "senderId": "peer_alice",
  "originId": "peer_alice",
  "ttl": 5,
  "hopCount": 0,
  "vectorClock": { "peer_alice": 10, "peer_bob": 7 }
}
```

**Signature** = `ECDSA(Hash(txId|from|to|amount|nonce|timestamp), privateKey)`

#### Receipt Message

```json
{
  "messageId": "msg_ghi789",
  "type": "RECEIPT",
  "payload": "{
    \"txId\": \"tx_def456\",
    \"receiverId\": \"peer_bob\",
    \"timestamp\": 1234567895,
    \"signature\": \"0xRecSig...\"
  }",
  "senderId": "peer_bob",
  "originId": "peer_bob",
  "ttl": 5,
  "hopCount": 0,
  "vectorClock": { "peer_alice": 10, "peer_bob": 8 }
}
```

---

## Consensus & Ledger

### Local Ledger Structure

```typescript
// src/services/ledger/LocalLedger.ts

interface LedgerEntry {
  txId: string;
  type: 'DEBIT' | 'CREDIT';
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
  timestamp: number;
  signature: string;          // ECDSA(txId, from, to, amount, nonce, timestamp)
  status: 'PENDING' | 'CONFIRMED' | 'SETTLED';
  vectorClock: VectorClockMap; // For causal ordering
}

type VectorClockMap = Map<string, number>;
// e.g. { "peer_alice": 10, "peer_bob": 7 }
```

### Vector Clock Algorithm

Each peer maintains a logical clock for every other peer:

```
Init: VC = { peerId: 0 }

On Local Event:
  VC[localPeerId]++

On Receive(message):
  For each peer in message.vectorClock:
    VC[peer] = max(VC[peer], message.vectorClock[peer])
  VC[localPeerId]++

On Send(message):
  message.vectorClock = copy(VC)
  message.vectorClock[localPeerId]++
```

**Causality Invariant**:
- Event A happens-before Event B iff VC_A < VC_B component-wise
- If neither A < B nor B < A, events are concurrent (no dependency)

**Conflict Resolution**:
When ledger receives same txId from multiple paths with different content:
1. Use timestamp as tiebreaker (first wins)
2. Or: use deterministic ordering (peer ID as secondary)
3. Mark as conflicted (flag for manual review)

### Balance Computation

```typescript
getBalance(address: string): string {
  let balance = BigInt(0);

  for (const entry of this.entries) {
    if (entry.status === 'SETTLED') continue; // Skip on-chain settled

    if (entry.type === 'CREDIT' && entry.to === address) {
      balance += BigInt(entry.amount);
    } else if (entry.type === 'DEBIT' && entry.from === address) {
      balance -= BigInt(entry.amount);
    }
  }

  return balance.toString();
}
```

**Key Insights**:
- Balance is **transient** and **derived** from ledger
- No permanent balance storage (always computed)
- Order matters only for prevention of overspend
- If peer submits DEBIT before receiving CREDIT, entry is still valid (post-settlement)

### Consistency Guarantees

**Strong Consistency** (across single peer):
- Local ledger is authoritative for that peer
- No conflicting transactions accepted

**Eventual Consistency** (across mesh):
- Different peers may see transactions in different orders initially
- Vector clocks ensure consistent causal ordering
- When network partitions heal, peers merge their ledgers
- Deterministic conflict resolution ensures same final state

**Absence of Guarantee**:
- No protection against double-spend in offline mode
- Relies on peers not maliciously spending same balance to multiple recipients
- **Assumption**: Peers are semi-honest (not Byzantine adversaries)
- On-chain settlement is where double-spend is actually prevented

---

## Security

### Threat Model

#### Assumption: Semi-Honest Peers
- Peers follow the protocol
- But may try to exploit timing, order, or information leaks
- **Not robust** against Byzantine peers (malicious adversaries)

#### Offline Threats

| Threat | Mitigation |
|--------|-----------|
| Eavesdropping (BLE) | ECDH key exchange + AES-256-GCM |
| Message tampering | HMAC in ciphertext |
| Replay attack | Nonce + timestamp in transaction |
| Double-spend (offline) | Ledger ordering (first-seen wins) |
| Ledger divergence | Vector clocks + deterministic conflict resolution |
| Key loss | Mnemonic backup (user responsibility) |
| Private key theft | Keychain encryption (OS level) |

#### On-Chain Threats

| Threat | Mitigation |
|--------|-----------|
| Replay attack | Chain ID + nonce in transaction |
| Unauthorized signing | Private key signing (cryptographic proof) |
| Double-spend | Blockchain consensus (nonce uniqueness) |
| Transaction front-run | Not mitigated (would need private mempool) |
| Private key theft | Private key never sent to RPC (local signing only) |

### Cryptographic Schemes

#### HD Wallet (BIP-39 + BIP-44)

```
Recovery Phrase (12 words)
    ↓ PBKDF2(phrase, salt)
Seed (512 bits)
    ↓ Master Key (secp256k1)
m/
    ↓ Hardened Derive (m/44')
EVM Account Level
    ↓ Hardened Derive (m/44'/60')
Coin Type (60 = Ethereum)
    ↓ Non-Hardened Derive (m/44'/60'/0')
Account (0 = First Account)
    ↓ Non-Hardened Derive (m/44'/60'/0'/0')
Address Chain (External)
    ↓ Non-Hardened Derive (m/44'/60'/0'/0'/0)
Ethereum Address #0
```

**Why Hardened Derivation?**
- Public key cannot derive child keys
- Stolen public key doesn't leak master key

#### Transaction Signing

```
Transaction:
{
  to: "0xBob",
  amount: "10.5",
  nonce: 5,
  timestamp: 1234567890,
  tokenAddress: "0xToken"
}
    ↓
Serialize (canonical JSON)
    ↓
Hash (SHA-256)
    ↓
Sign (ECDSA with private key)
    ↓
Signature (r, s components)
    ↓
Recovery ID (0-3, to recover public key)
    ↓
Store in ledger
```

#### Message Encryption

```
Plain Message
    ↓
Generate ephemeral ECDH key pair
    ↓
Shared secret = ECDH(myPrivateKey, peerPublicKey)
    ↓
Derive symmetric key via HKDF(shared_secret, salt, info)
    ↓
Encrypt with AES-256-GCM
    ↓
Generate HMAC-SHA256(iv + ciphertext + aad, keyMaterial)
    ↓
Output: { iv, ciphertext, hmac, ephemeralPublicKey }
```

### Key Storage

#### Private Key

**iOS**:
- Stored in Keychain with `kSecAttrAccessibleAfterFirstUnlock`
- Encrypted by device passcode/biometric
- Never readable to app process; signing happens in Secure Enclave

**Android**:
- Stored in Android Keystore with `PURPOSE_SIGN`
- Encrypted by device security (pattern/PIN/biometric)
- Hardware-backed on modern devices (TEE)

#### Recovery Phrase (Mnemonic)

- Encrypted and stored in Keychain/Keystore (same as private key)
- User should also write down physically or store separately
- No cloud backup (user responsibility)
- App can't recover if device lost

### BLE Security

**BLE Pairing**:
- Not mandatory; devices discover each other as peers
- If pairing used, uses AES-CCM for link encryption
- Currently relies on BLE security (no custom ECDH handshake shown yet)

**Future Enhancement**:
- Add ECDH key exchange message type
- Each peer generates ephemeral ECDH keypair
- Exchange public keys via BLE (unencrypted, then use for message encryption)
- Prevents eavesdropping on subsequent mesh messages

---

## Performance Considerations

### Latency

#### BLE Transmission
```
Data → split into MTU chunks (512 bytes)
    ↓
Each chunk: 1-3 ms per write (sequential)
    ↓
Total: ~1ms per 512 bytes
    ↓
Example: 2KB message = ~4 writes = ~4 ms
```

#### Mesh Propagation
```
Peer A publishes
    ↓ 1ms (BLE)
Peer B receives & forwards
    ↓ 1ms (BLE)
Peer C receives & forwards
    ↓
Multi-hop (3 peers in chain): ~5-10 ms
```

#### Processing Overhead
- JSON parsing: < 1 ms
- Signature verification: < 10 ms (ECDSA)
- Ledger update: < 1 ms (append)
- **Total**: ~10-20 ms end-to-end

#### Acknowledgment Flow
```
Peer A → TRANSACTION (2 ms)
         ↓ (Process: 10 ms)
Peer B → RECEIPT (2 ms)
Total: ~14 ms
```

### Throughput

#### Scenario: Dense Network (10 devices in range)

```
If all devices send simultaneously:
  - Each sends to 9 peers
  - 9 writes × 1ms each = 9 ms per device
  - But writes happen in parallel (one to each peer)
  - Bottleneck: BLE radio can handle ~1-2 concurrent writes
  - Effective: ~5-10 messages/second sustainable
```

#### Scaling Transactions

```
10 txs/second × 10 devices = 100 total tx events
But many will be duplicates (gossip)
Effective: ~20-30 unique txs/second in a 10-device network
```

### Memory

#### Per Device

```
Connected devices: 10 peers × 500 bytes = 5 KB
Ledger entries: 1000 txs × 200 bytes = 200 KB
Seen message cache: 1000 IDs × 50 bytes = 50 KB
Redux store state: ~100 KB
Total: ~400 KB (acceptable on modern phones)
```

#### Message Buffers

```
RX buffer (reassembling chunks): 1-2 MB possible
TX queue: typically < 100 KB
JSON parsing: temporary; released after process
```

### Battery

#### BLE Scanning
```
Continuous scan: ~10-20 mA draw
Every 5 seconds (short burst): ~1-2 mA average
```

#### Bluetooth Radio
```
Active data transfer: ~10 mA
Idle (connected): ~1-2 mA
```

#### App Overhead
```
Periodic settlement check: ~5% CPU
Message processing: event-driven (low when idle)
Total battery impact: ~5-10% per hour of active use
```

---

## Scalability

### Limits

#### Network Size
```
Problem: Full mesh gossip
  - 100 devices
  - Each broadcasts to ~50 neighbors
  - Each device relays each message it sees
  - Exponential growth in duplicate messages

Solution: TTL-based flooding (current)
  - TTL = 3 means message travels ~3 hops
  - Beyond 3 hops, message stops propagating
  - Covers ~100-200 device network if well-connected

For larger: Implement hierarchical/clustered topology
```

#### Transaction Throughput
```
Current: ~20-30 txs/sec in a 10-device mesh
Scaling issue: Ledger serialization (JSON encoding)
  - Each tx = ~200 bytes JSON
  - 1000 txs = 200 KB
  - Periodic sync message = expensive

Solution: Binary serialization (protobuf, CBOR)
  - Could reduce to ~50 bytes per tx
```

#### Storage
```
Phone storage: 128 GB typical
At ~200 bytes per tx:
  - 1 GB ledger = 5 million txs
  - Achievable after ~2 years of continuous usage

Solution: Archive old transactions (Merkle tree root)
```

### Optimization Opportunities

#### 1. Binary Serialization
Replace JSON with:
- **CBOR** (Concise Binary Object Representation)
- **Protobuf** (Protocol Buffers)
- Reduction: ~50% size

#### 2. Ledger Pruning
```
Keep recent 1000 txs in active ledger
Archive older txs to Merkle tree
Root hash includes all history
Recover from any recent state + proofs
```

#### 3. Incremental Sync
Instead of sending full ledger:
```
Peer A: "I have txs 0-1000"
Peer B: "I only have 0-500, send 501-1000"
Delta sync: much smaller than full sync
```

#### 4. BLE PHY Optimization
```
BLE 5.1: 2 Mbps (vs 1 Mbps in 5.0)
Coded PHY: longer range but slower
Topology-aware: connect to subset of peers
```

---

## Failure Modes

### Network Failure

#### Scenario: Partition
```
Device Group A ←→ (lost BLE connection) ←→ Device Group B

A's state:
  - Only sees txs from A, B, D, E
  - Local ledger diverges

B's state:
  - Only sees txs from B, C, F
  - Different ledger state

When network heals:
  - A & B exchange ledgers
  - Vector clocks identify conflicting txs
  - Deterministic resolver picks winner
  - Final state converges
```

**Ledger Divergence Possibility**:
- Alice sends 50 tokens to Bob (in partition A)
- Alice sends 50 tokens to Carol (in partition B)
- On partition heal, one transfer may fail (insufficient balance)
- **Current handling**: Flagged as conflict; user notified
- **Future**: Automatic refund or settlement priority

#### Scenario: Isolated Device
```
Device goes offline for 3 days
Device A reconnects to mesh
Gossip protocol broadcasts all unseen txs
Device A's ledger becomes current (catch-up)
Timestamp order determines transaction order
```

### Storage Failure

#### Lost Private Key
```
Device storage corrupted
Private key lost (keychain unreadable)
Mnemonic NOT backed up by user
⚠️ Result: Wallet UNRECOVERABLE
  - Tokens remain in accounts but inaccessible
  - No way to sign transactions

Solution: Enforce mnemonic backup before allowing transfers
```

#### Lost Mnemonic
```
User didn't write down recovery phrase
Device lost/stolen
⚠️ Result: Wallet UNRECOVERABLE
  - Device can still sign locally (if secure enclave intact)
  - But can't restore on new device

Solution: Cloud backup (encrypted with user password)
```

### Double-Spend Attack

#### Scenario 1: Offline Double-Spend
```
Alice (balance: 100 tokens)

Path 1: Alice → Bob (send 100)
Path 2: Alice → Carol (send 100)

Both paths initiated but Bob & Carol in different partitions
⚠️ Result: Both transfers appear valid offline
  - Ledger: Alice has balance 0 and also -200
  - Inconsistent state

Detection: On-chain settlement reveals duplicate nonce
  - Only first submission succeeds
  - Second fails (nonce already used)

Fix: Implement offline consensus (e.g., commit-reveal)
```

#### Scenario 2: Malicious Offline Double-Spend
```
Alice, Bob, Carol in isolated partition
Alice signs DEBIT to Bob (100 tokens)
Alice also signs DEBIT to Carol (100 tokens)
Bob & Carol both accept (no way to verify against Carol's path)

On partition heal:
  - Carol learns of Bob's tx
  - Carol's ledger now shows Alice owes both
  - Alice's balance = -200 (overspent)

Settlement phase:
  - Alice tries to settle both txs on-chain
  - Second tx fails (insufficient nonce + balance)

Resolution: Litigation/manual intervention
  - No cryptographic way to prove Alice's intent
  - Community rules decide which transfer honors
  - Could implement "first-seen" ordering (Carol's tx reverted)
```

### Processing Failure

#### Message Corruption
```
BLE data bit flip (rare with CRC, but possible)
JSON parsing fails
GossipError thrown
Message dropped (not relayed)
Peers don't receive tx

Handling: Retransmit on next heartbeat
```

#### Nonce Conflict
```
Device A sends tx with nonce 5
Device B (confused state) also sends with nonce 5
Both broadcast; peer sees two txs with same nonce

Handling: Keep first; drop second (dedup by nonce)
Settlement: First one confirms; second fails
```

### Connection Failure

#### BLE Disconnection
```
Middle of sending 2KB message
MTU 1: sent ✓
MTU 2: sent ✓
MTU 3: DISCONNECT

Receiving device gets partial message (2/3 chunks)
Timeout after 30 seconds → discard

Handling: Retransmit from sender on reconnect
```

#### RPC Failure (Settlement)
```
SettlementService tries to broadcast tx
RPC endpoint unreachable
Broadcasting fails
Transaction stays in PENDING

Handling: Retry on next interval (30 seconds)
Logs warning for user
Eventually succeeds when RPC recovers
```

### Byzantine Behavior (Semi-Honest Assumption Violated)

#### Scenario: Peer Claims False Balance
```
Malicious Alice claims balance of 10,000,000 tokens
(But never received CREDIT messages to justify it)

Detection: Peer can verify signatures on each CREDIT
If signature doesn't match Alice's address → reject

But without signature: peer might claim unbacked balance
Vector clock only tracks causality, not value
⚠️ Mitigation: Enforce that each CREDIT must be signed by sender
```

#### Scenario: Duplicate Broadcasting
```
Malicious Bob sends same TRANSACTION multiple times
(Different messageIds, same txId)

Detection: Dedup on (txId, from, to, amount, nonce)
Not just messageId

Mitigation: Each transaction only counted once
```

#### Scenario: Eclipse Attack (Partition)
```
Malicious peer surrounds honest peer
Feeds only subset of valid txs
Honest peer thinks balance is lower than reality

Mitigation: Ask multiple peers for balance
Calculate max balance seen (most optimistic)
Verify on-chain at settlement
```

---

## Conclusion

### Strengths
✅ Works 100% offline
✅ Decentralized (no trusted authority)
✅ Private keys stay on device
✅ Eventual consistency without Paxos/Raft
✅ Scales to ~100-200 devices with tuning

### Weaknesses
⚠️ Not Byzantine-robust (assumes semi-honest peers)
⚠️ Offline double-spend possible (resolved at settlement)
⚠️ Ledger divergence during long partitions
⚠️ Throughput limited by BLE bandwidth
⚠️ Storage grows unbounded

### Best For
- Low-connectivity remittance networks
- Disaster relief scenarios
- Privacy-first communities
- Temporary payment networks

### Not Suitable For
- High-value transactions (without on-chain settlement)
- Byzantine/adversarial environments
- Real-time settlement requirements
- High-throughput scenarios (1000+ txs/sec)
