# BlockPay Blockchain Integration

## What is implemented

After MongoDB commits a payment, the Express backend submits its SHA-256 receipt to `BlockPay.sol`. Amounts are converted from INR to integer paise before submission. The transaction document records `pending`, `confirmed`, `failed`, or `not_anchored`, along with the Ethereum transaction hash, block number, attempt count, submission/confirmation times, and the last RPC error.

MongoDB settlement and Ethereum cannot form one cross-system atomic transaction. Therefore a blockchain failure never removes a completed wallet payment. It is recorded as `failed` and can be retried through `POST /api/transactions/:id/blockchain/retry`. Verification uses `GET /api/transactions/:id/blockchain/verify` and calls the deployed contract's `verifyTransaction()` function.

## Local requirements

- Node.js and npm
- MongoDB running at `mongodb://127.0.0.1:27017/blockpay`
- Three terminals
- Expo Go or an Android/iOS emulator for the mobile app

## Run locally

From the repository root, install dependencies once:

```powershell
npm install
```

Terminal 1 — keep the local blockchain running:

```powershell
npm run blockchain:node
```

Terminal 2 — deploy the contract after the node starts:

```powershell
npm run blockchain:deploy
```

Copy the printed address to `backend/server/.env` as `BLOCKPAY_CONTRACT_ADDRESS`. Hardhat normally deploys the first contract to `0x5FbDB2315678afecb367f032d93F642f64180aa3` on a fresh node, but always use the address printed by your deployment command.

Start MongoDB, then start the API in Terminal 2:

```powershell
npm run server
```

To connect the mobile app to this backend, change `frontend/mobile/.env`:

```dotenv
EXPO_PUBLIC_DEMO_MODE=false
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api
```

Use your computer's LAN IP instead of `10.0.2.2` on a physical phone. Restart Expo after changing environment variables:

```powershell
npm run mobile -- --clear
```

Register two real local users in the mobile app, then send a payment. Its receipt will show the blockchain transaction hash and block number. The Verify screen queries the contract directly through the authenticated backend endpoint.

## Environment variables

| Variable | Purpose |
|---|---|
| `BLOCKCHAIN_ENABLED` | Enables automatic receipt submission |
| `BLOCKCHAIN_RPC_URL` | Ethereum JSON-RPC endpoint |
| `BLOCKPAY_CONTRACT_ADDRESS` | Address returned by contract deployment |
| `BLOCKCHAIN_PRIVATE_KEY` | Backend signer that pays gas |
| `BLOCKCHAIN_CONFIRMATIONS` | Blocks to wait before marking confirmed |

The checked-in local `.env` uses Hardhat's publicly known development key. It is safe only for the local Hardhat network. Never send real funds to it and never use it on a public network.

## Public testnet requirements

For Sepolia or another testnet you additionally need an RPC provider URL, a newly created backend wallet, faucet test ETH for gas, and a contract deployed to that network. Keep the real private key outside source control. Update the five blockchain environment variables, restart the backend, and ensure the RPC network matches the deployed contract address.

## Verification

Smart-contract behavior is covered by Hardhat tests. Backend integration tests cover successful confirmation, RPC failure handling, retry metadata, paise conversion, and contract verification. A local smoke script can verify a deployment:

```powershell
$env:BLOCKPAY_CONTRACT_ADDRESS="your-address"
npm --prefix backend/contracts run smoke:local
```
