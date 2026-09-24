# BlockPay

BlockPay is a MERN campus payment platform with demo INR wallets, QR based payments, split bills, payment requests, notifications, and tamper-evident blockchain receipts.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy backend environment variables:

```bash
copy backend\server\.env.example backend\server\.env
```

3. Start MongoDB locally or update `MONGO_URI` in `backend/server/.env`.

4. Run the app:

```bash
npm run dev
```

The API runs on `http://localhost:5000` and the React app runs on `http://localhost:5173`.

## Expo Mobile App

The repository is separated into `frontend/` and `backend/`. The Expo mobile app and React web client live under `frontend/`; the Express API, Solidity contract and Docker configuration live under `backend/`.

Backend:

```powershell
cd backend/server
npm install
npm run dev
```

Mobile:

```powershell
cd frontend/mobile
npm install
Copy-Item .env.example .env
npx expo start
```

For an Android Studio emulator, use `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api`. For a physical device, replace the host with the development computer's LAN IPv4 address and keep the phone and computer on the same network. See `frontend/mobile/README.md` for detailed Android and iOS instructions.

## Project structure

```text
frontend/
  client/       React web application
  mobile/       React Native + Expo application
backend/
  server/       Express and MongoDB API
  contracts/    Solidity contract and Hardhat tests
  docker/       Local infrastructure configuration
docs/           Architecture and testing documentation
```

## MVP Scope

- JWT authentication with registration, login, profile, and forgot password simulation
- New user demo wallet with INR 10,000 balance
- Username transfers with PIN confirmation placeholder
- SHA-256 hash-linked receipts for every payment
- Transaction history with filters
- Payment requests and split bill request generation
- Friends, notifications, QR payload generation, and scan parsing
- Admin analytics summary
- Independently tested Solidity receipt registry in `backend/contracts/solidity/BlockPay.sol`

## Automated tests

Run every backend, mobile, and smart-contract test from the repository root:

```bash
npm test
```

Run a single layer or generate coverage:

```bash
npm run test:server
npm run test:mobile
npm run test:contracts
npm run test:coverage
```

Backend tests use an isolated in-memory MongoDB replica set and never touch the configured development or production database. See `docs/TESTING.md` for the test architecture, detailed cases, results, and limitations.

## Blockchain integration

The Express backend can automatically anchor each committed payment receipt in the Solidity registry and expose authenticated verification and retry endpoints. See `docs/BLOCKCHAIN.md` for local deployment, environment variables, security notes, and public-testnet requirements.
