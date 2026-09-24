# BlockPay API

Base URL: `http://localhost:5000/api`

All protected routes require:

```http
Authorization: Bearer <jwt>
```

## Authentication

- `POST /auth/register` - create user and INR 10,000 demo wallet
- `POST /auth/login` - return JWT and profile
- `POST /auth/forgot-password` - simulate OTP reset
- `GET /auth/profile` - current user
- `PUT /auth/profile` - update name, phone, avatar, college ID, bio
- `POST /auth/logout` - client-side logout acknowledgement

## Wallet

- `GET /wallet` - wallet and balance
- `GET /wallet/balance` - alias for wallet
- `POST /wallet/transfer` - send demo INR to a username
- `POST /wallet/deposit-demo` - add demo balance
- `POST /wallet/withdraw-demo` - remove demo balance

## Transactions

- `GET /transactions?filter=all|today|week|month` - transaction history
- `GET /transactions/:id` - transaction receipt
- `POST /transactions/send` - alias for transfer
- `POST /transactions/request` - request money from a username
- `GET /transactions/requests` - sent and received requests
- `POST /transactions/accept/:id` - accept and pay request
- `POST /transactions/reject/:id` - reject request
- `POST /transactions/split` - create payment requests for bill members

## Friends

- `GET /friends`
- `POST /friends`
- `DELETE /friends/:friendId`

## QR

- `POST /qr/generate`
- `POST /qr/scan`

## Notifications

- `GET /notifications`
- `PUT /notifications/:id/read`
- `PUT /notifications/read-all`

## Admin

- `GET /admin/summary` - admin-role-only user count, payment count, total volume, latest transactions, high-value demo transfer alerts
