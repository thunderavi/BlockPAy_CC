# BlockPay Testing Guide

## Strategy

BlockPay tests the business-critical layers separately and then exercises complete user journeys through the real Express routes. Mobile tests use Jest and React Native Testing Library. API and journey tests use Jest, Supertest, and a disposable MongoDB in-memory replica set. Receipt tests run the real SHA-256 implementation. Smart-contract tests deploy the real Solidity contract to Hardhat's local EVM.

No test uses production data. MongoDB collections are cleared between tests, and the in-memory server is stopped after the suite. There are no skipped or focused tests.

## Architecture

| Layer | Location | Runtime | Purpose |
|---|---|---|---|
| Mobile | `frontend/mobile/test` | Jest + React Native Testing Library | Authentication UI, shared states/components, formatting, peers and QR parsing |
| API/database | `backend/server/test/api.test.js` | Jest + Supertest + MongoMemoryReplSet | Routes, authorization, transfers, atomic rollback, requests, split bills, friends, QR, notifications and admin |
| Receipts | `backend/server/test/receipt.test.js` | Jest | Deterministic SHA-256 hashing, tamper detection, reference IDs and previous-hash linkage |
| E2E journeys | `backend/server/test/e2e.test.js` | Supertest against the complete Express app | Register/login/wallet, username payment, QR payment, requests, split bills and security |
| Contract | `backend/contracts/test` | Hardhat local network | Real `BlockPay.sol` deployment and public contract behavior |

## Commands

From the repository root:

```bash
npm test
npm run test:coverage
```

Individual layers:

```bash
npm run test:server
npm run test:mobile
npm run test:contracts
```

Watch modes:

```bash
npm --prefix backend/server run test:watch
npm --prefix frontend/mobile run test:watch
```

Coverage HTML is written to `backend/server/coverage/lcov-report/index.html` and `frontend/mobile/coverage/lcov-report/index.html`.

## Test cases and expected results

- Authentication accepts a valid registration/login, rejects duplicate identity data and bad credentials, and protects routes without a valid JWT.
- A successful transfer decreases the sender, increases the receiver, and creates a 64-character hexadecimal receipt hash in one MongoDB transaction.
- A deliberately failed receipt write rolls back both balance changes and leaves no transaction document.
- Invalid, zero, negative, self, unknown-recipient, insufficient-balance and wrong-PIN transfers are rejected.
- Receipt hashes are deterministic for the same canonical payload. Changing sender, receiver, amount, note, timestamp or previous hash changes the digest.
- Requests can be accepted or rejected, split shares are rounded correctly, and notifications are created and marked read.
- QR payloads accept only valid `BLOCKPAY_QR` JSON and correctly prefill the receiver, amount and purpose.
- Non-admin users cannot access the admin summary; promoted admins can.
- The Solidity registry stores proofs, emits `TransactionCreated`, rejects missing/duplicate IDs, verifies exact hashes, rejects modified/unknown proofs, and returns one or all entries.
- Six API-level journeys cover onboarding, username payment, QR payment, payment-request settlement, bill splitting and security barriers.

## Blockchain boundary

The Solidity tests are genuine local-EVM contract tests. When blockchain configuration is enabled, the server automatically submits committed receipt hashes to `BlockPay.sol`, records pending/confirmed/failed state, and supports real contract verification and retry. When disabled, receipts truthfully expose `blockchainStatus: not_anchored`. Integration tests inject a contract boundary to deterministically exercise confirmation and RPC failure handling; the Hardhat smoke script performs a real local-EVM submission.

## Known limitations

- E2E tests exercise complete backend journeys without launching a physical Android/iOS device. Camera hardware, OS permission dialogs and native navigation gestures still require device or emulator validation.
- Mobile automated coverage focuses on stable UI behavior and pure QR/formatting logic. Network-integrated screens are backed by the separately comprehensive API journey suite.
- Hardhat coverage is behavioral test coverage; Solidity line coverage is not generated because no coverage plugin is installed.
- MongoDB atomicity requires a replica set. Automated tests start one; production should set `MONGO_TRANSACTIONS=true` only when its MongoDB deployment supports transactions.

## Final results

Validated on 3 September 2026:

| Suite | Total | Passed | Failed | Coverage |
|---|---:|---:|---:|---|
| Backend (including six E2E journeys) | 33 | 33 | 0 | Run `npm run test:coverage` for the current report |
| Mobile | 16 | 16 | 0 | Run `npm run test:coverage` for the current report |
| Smart contract | 9 | 9 | 0 | Behavioral coverage; every public contract function is tested |
| E2E subset | 6 | 6 | 0 | Included in the backend total |

`npx expo-doctor` also passed all 21 checks. No external service was required for these automated suites: MongoDB and Ethereum are supplied by disposable local test runtimes.
