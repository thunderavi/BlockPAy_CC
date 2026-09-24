# BlockPay: Enterprise Hybrid Blockchain Architecture

![BlockPay System Architecture](./assets/system_architecture.jpg)


**BlockPay** is an enterprise-grade, high-throughput digital payments ecosystem designed around a **hybrid off-chain/on-chain settlement architecture**:

* **Off-Chain Real-Time Settlement (< 50ms):** High-velocity double-entry ledger execution running on an ACID-compliant MongoDB database cluster, offering instant P2P transfers, QR scan-to-pay, merchant point-of-sale checkout, bill splitting, and automated payouts.
* **On-Chain Trust & Immutability Anchor:** Cryptographic proof generation (SHA-256 state hashing and Merkle proofs) offloaded to multi-threaded worker pools and asynchronously batched onto an EVM-compatible smart contract ledger (Ethereum / Sepolia / Hardhat).
* **Zero Direct Blockchain Exposure:** Clients never hold private signing keys or interact directly with the blockchain RPC; all interactions are mediated through a hardened API Gateway with rate limiting, HMAC signing, and circuit breaker fault isolation.

---

## 2. End-to-End Architecture Diagram

```mermaid
flowchart TB
    subgraph Clients["1. Client & Presentation Layer"]
        MobileApp["📱 Mobile App (React Native + Expo)<br/>• Biometric Auth (FaceID / Fingerprint)<br/>• SecureStore JWT & Offline QR<br/>• Dynamic Camera Scanner"]
        WebPortal["💻 Web Portal (React + Vite)<br/>• Analytics & Transaction Explorer<br/>• Wallet Management & Activity Feed"]
        MerchantPOS["🏪 Merchant Terminal / SDK<br/>• Dynamic QR Generation<br/>• HMAC API Key Auth & Checkout API"]
        AuditorUI["🔍 Regulatory / Authority Portal<br/>• Merkle Proof Verifier<br/>• Immutable Audit Log Inspector"]
    end

    subgraph Gateway["2. Edge & Security Gateway"]
        direction TB
        ReverseProxy["⚡ Reverse Proxy / SSL Termination"]
        HelmetCors["🛡️ Helmet Security & Dynamic LAN/CORS"]
        RateLimiter["⏱️ Multi-Tier Rate Limiting<br/>(Auth, Merchant, Authority)"]
        AuthModule["🔑 Auth Engine: JWT Bearer & HMAC API Keys"]
        Idempotency["🔁 Idempotency Guard (Redis / In-Memory Lock)"]
        CircuitBreaker["⚡ Circuit Breaker (Blockchain RPC Fallback)"]
    end

    subgraph AppCluster["3. Application Core (Node.js Clustered Workers)"]
        direction TB
        AuthCtrl["Auth & Identity Service"]
        WalletEngine["Double-Entry Wallet Engine<br/>• Atomic Balance Debit / Credit<br/>• PIN & Biometric Verification"]
        TxRouter["Transaction Router (P2P, Split-Bill, QR)"]
        CheckoutEngine["Merchant Checkout & Payment Links"]
        PayoutEngine["Automated Payouts & Refunds"]
        DisputeService["Dispute & Compliance Engine"]
    end

    subgraph ComputePool["4. Asynchronous & High-Performance Compute"]
        WorkerPool["⚙️ Crypto Worker Pool (Node.js Worker Threads)<br/>• SHA-256 Receipt Hashing<br/>• Merkle Tree Construction<br/>• Offloads CPU from Event Loop"]
        TaskQueue["📬 In-Memory / Distributed Task Queue<br/>• Blockchain Anchor Dispatcher<br/>• Exponential Backoff Webhook Delivery"]
        L1Cache["⚡ L1 In-Memory Cache (TTL & LRU)"]
    end

    subgraph DataLayer["5. Primary Persistence Layer (ACID Ledger)"]
        MongoPrimary[("🍃 MongoDB Clustered Replica Set<br/>• Users & Wallets<br/>• Transactions (Double-Entry Log)<br/>• Merchants & Orders<br/>• Audit Trails & Disputes")]
    end

    subgraph BlockchainLayer["6. Web3 & Decentralized Trust Anchor"]
        HardhatNode["⛓️ EVM Smart Contract (Hardhat / Sepolia)<br/>• BlockPayLedger.sol<br/>• Public Transaction Proof Registry<br/>• Merkle Root Verification"]
    end

    subgraph WebhookConsumers["7. External Ecosystem"]
        MerchantServers["🌐 Merchant Backend Webhooks (HMAC SHA-256)"]
        PushService["🔔 Mobile Notification Service (FCM / Expo APNS)"]
    end

    %% Client to Gateway
    MobileApp -->|HTTPS / WSS| ReverseProxy
    WebPortal -->|HTTPS / REST| ReverseProxy
    MerchantPOS -->|REST / API Key| ReverseProxy
    AuditorUI -->|REST / Read-Only| ReverseProxy

    %% Gateway internal
    ReverseProxy --> HelmetCors --> RateLimiter --> AuthModule --> Idempotency --> CircuitBreaker

    %% Gateway to App
    CircuitBreaker --> AuthCtrl
    CircuitBreaker --> WalletEngine
    CircuitBreaker --> TxRouter
    CircuitBreaker --> CheckoutEngine
    CircuitBreaker --> PayoutEngine
    CircuitBreaker --> DisputeService

    %% App to Cache & Workers
    TxRouter <--> L1Cache
    WalletEngine <--> MongoPrimary
    TxRouter -->|Raw Payload| WorkerPool
    WorkerPool -->|Hash & Merkle Root| TxRouter
    TxRouter --> MongoPrimary
    TxRouter -->|Enqueues Anchor Job| TaskQueue

    %% Background Queue Execution
    TaskQueue -->|Batch Proofs| HardhatNode
    TaskQueue -->|Signed Webhook Event| MerchantServers
    TaskQueue -->|Push Alert| PushService
```

---

## 3. High-Velocity Payment Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Sender (App)
    participant API as API Server (Node.js)
    participant Cache as L1 Cache
    participant DB as MongoDB (ACID)
    participant Pool as Crypto Worker Pool
    participant Queue as Async Task Queue
    participant Chain as EVM Smart Contract
    actor Bob as Receiver (App)

    Alice->>API: POST /api/transactions/send (PIN + Payload)
    API->>Cache: Verify Idempotency Key
    API->>DB: Atomic Transfer (Debit Alice, Credit Bob)
    DB-->>API: Transfer Committed
    API->>Pool: Offload Cryptographic Hashing
    Pool-->>API: Returns SHA-256 Receipt Hash & Merkle Proof
    API->>DB: Persist Transaction Record + Hash
    API->>Queue: Enqueue Blockchain Anchoring Job
    API-->>Alice: 200 OK (Instant Receipt < 50ms)
    API-->>Bob: Push Notification Sent

    critical Async On-Chain Anchor
        Queue->>Chain: recordProof(referenceId, hash, timestamp)
        Chain-->>Queue: Transaction Mined (TxHash & BlockNumber)
        Queue->>DB: Update Tx Status: "anchored"
    end
```

---

## 4. Entity-Relationship & Double-Entry Schema

```mermaid
erDiagram
    USER ||--o{ WALLET : owns
    USER ||--o{ FRIEND : has
    USER ||--o{ NOTIFICATION : receives
    WALLET ||--o{ TRANSACTION : debits_or_credits
    MERCHANT ||--o{ MERCHANT_ORDER : creates
    MERCHANT ||--o{ PAYMENT_LINK : generates
    MERCHANT ||--o{ PAYOUT : requests
    MERCHANT ||--o{ API_KEY : authenticates
    TRANSACTION ||--o| REFUND : triggers
    TRANSACTION ||--o| DISPUTE : raises
    MERCHANT_ORDER ||--o| TRANSACTION : settles

    USER {
        ObjectId _id PK
        string username UK
        string email UK
        string passwordHash
        string pinHash
        string role
        boolean isBiometricEnabled
    }

    WALLET {
        ObjectId _id PK
        ObjectId userId FK
        decimal balance
        string currency
        boolean isFrozen
    }

    TRANSACTION {
        ObjectId _id PK
        ObjectId senderWalletId FK
        ObjectId receiverWalletId FK
        decimal amount
        string type
        string status
        string referenceId UK
        string previousHash
        string currentHash
        string blockchainTxHash
        date timestamp
    }

    MERCHANT {
        ObjectId _id PK
        string businessName
        string merchantCode UK
        decimal feePercentage
        string webhookUrl
    }
```

---

## 5. Security & Fault Tolerance Model

* **Idempotency Defense:** `X-Idempotency-Key` headers stored in Redis/In-Memory cache to prevent double-charging on network retries.
* **Worker Thread Isolation:** Compute-heavy SHA-256 and Merkle hashing run in isolated worker threads (`cryptoPool.js`), ensuring non-blocking event-loop response times.
* **Circuit Breaker:** Automatically trips during blockchain RPC congestion or network downtime, buffering proofs locally without interrupting instant off-chain transaction settlement.
* **Zero-Key Client Exposure:** Mobile clients authenticate using biometric-secured JWTs; private blockchain keys remain strictly held in server HSM/secure environment.
