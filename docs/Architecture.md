# Architecture

BlockPay uses a MERN stack:

- React and Vite for the student-facing app
- React Native and Expo for the mobile student app in `frontend/mobile/`
- Express and Node.js for the API
- MongoDB with Mongoose for application data
- JWT for authentication
- A Solidity contract prototype for on-chain payment proofs

Both frontends communicate only with the Express REST API. Neither frontend connects directly to MongoDB or holds a blockchain signing key. The mobile app stores its JWT with Expo SecureStore and uses Expo Camera for QR scanning.

## Payment Flow

1. Sender searches for a receiver by username.
2. API validates the payment PIN and demo balance.
3. Sender wallet is debited and receiver wallet is credited.
4. A payment proof is generated from sender, receiver, amount, timestamp, previous hash, and reference ID.
5. Transaction data is stored in MongoDB.
6. The `hash` and `referenceId` can be mirrored to the Solidity contract for public verification.
7. Notifications are created for both participants.

## Blockchain Strategy

The MVP stores the full application transaction in MongoDB and stores proof data on-chain. This keeps the app fast and private while preserving a tamper-evident receipt that can be checked later.

## Next Enhancements

- Add Hardhat deployment scripts and Sepolia testnet integration
- Use MongoDB sessions for atomic transfers in production
- Add email delivery for OTP flows
- Add real QR scanner camera support
- Add role-protected admin middleware
- Add unit and integration tests
