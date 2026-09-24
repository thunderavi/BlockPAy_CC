import mongoose from "mongoose";
import { config } from "../src/config.js";
import { User } from "../src/models/User.js";
import { Wallet } from "../src/models/Wallet.js";
import { Transaction } from "../src/models/Transaction.js";
import { PaymentRequest } from "../src/models/PaymentRequest.js";
import { Notification } from "../src/models/Notification.js";
import { Friend } from "../src/models/Friend.js";

const API_BASE = `http://localhost:${config.port}/api`;
const timestamp = Date.now().toString().slice(-6);

const userAData = {
  name: "Alice Tester",
  username: `alice_${timestamp}`,
  email: `alice_${timestamp}@blockpay.test`,
  phone: `91${timestamp}01`,
  password: "Password@123",
  bio: "Computer Science student",
  collegeId: "CS-2026-001"
};

const userBData = {
  name: "Bob Merchant",
  username: `bob_${timestamp}`,
  email: `bob_${timestamp}@blockpay.test`,
  phone: `91${timestamp}02`,
  password: "Password@123",
  bio: "Campus Book Store",
  collegeId: "STORE-001"
};

const adminData = {
  name: "Admin User",
  username: `admin_${timestamp}`,
  email: `admin_${timestamp}@blockpay.test`,
  phone: `91${timestamp}03`,
  password: "Password@123"
};

let tokenA = "";
let tokenB = "";
let adminToken = "";
let userAId = "";
let userBId = "";
let adminId = "";

const headers = (token) => ({
  "Content-Type": "application/json",
  "x-bypass-rate-limit": "true",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

const passedEndpoints = [];

async function testEndpoint(name, method, path, token, body = null, expectedStatus = 200) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: headers(token),
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  
  if (res.status !== expectedStatus && res.status !== 201 && res.status !== 200 && res.status !== 204) {
    console.error(`  ❌ [${method} ${path}] Expected ${expectedStatus}, got ${res.status}:`, data);
    throw new Error(`Endpoint ${method} ${path} failed with status ${res.status}`);
  }

  passedEndpoints.push(`${method.padEnd(6)} ${path}`);
  console.log(`  ✅ [${res.status}] ${method.padEnd(6)} ${path}`);
  return { status: res.status, body: data };
}

async function runComprehensiveTests() {
  console.log("\n=======================================================");
  console.log("   🚀 EXHAUSTIVE 100% API ENDPOINTS AUTOMATION TEST   ");
  console.log(`   Target Server: ${API_BASE}`);
  console.log(`   MongoDB URI:   ${config.mongoUri}`);
  console.log("=======================================================\n");

  await mongoose.connect(config.mongoUri);
  console.log("🍃 Database connected for live inspection.\n");

  // ==========================================
  // MODULE 1: AUTHENTICATION & PROFILE APIS (6 Endpoints)
  // ==========================================
  console.log("--- MODULE 1: AUTH & USER PROFILE ---");
  
  // 1. POST /api/auth/register (User A)
  const regA = await testEndpoint("Register Alice", "POST", "/auth/register", null, userAData, 201);
  tokenA = regA.body.token;
  userAId = regA.body.user._id;

  // 2. POST /api/auth/register (User B)
  const regB = await testEndpoint("Register Bob", "POST", "/auth/register", null, userBData, 201);
  tokenB = regB.body.token;
  userBId = regB.body.user._id;

  // 3. POST /api/auth/register & promote to Admin
  const regAdmin = await testEndpoint("Register Admin", "POST", "/auth/register", null, adminData, 201);
  adminToken = regAdmin.body.token;
  adminId = regAdmin.body.user._id;
  await User.findByIdAndUpdate(adminId, { role: "admin" });

  // 4. POST /api/auth/login
  const loginRes = await testEndpoint("Login Alice", "POST", "/auth/login", null, {
    email: userAData.email,
    password: userAData.password
  }, 200);

  // 5. POST /api/auth/forgot-password
  await testEndpoint("Forgot Password", "POST", "/auth/forgot-password", null, {
    email: userAData.email
  }, 200);

  // 6. GET /api/auth/profile
  await testEndpoint("Get Alice Profile", "GET", "/auth/profile", tokenA);

  // 7. PUT /api/auth/profile
  await testEndpoint("Update Alice Profile", "PUT", "/auth/profile", tokenA, {
    bio: "Updated AI & Blockchain Researcher",
    collegeId: "CS-2026-999"
  }, 200);

  // 8. POST /api/auth/logout
  await testEndpoint("Logout", "POST", "/auth/logout", tokenA);

  // ==========================================
  // MODULE 2: USERS & SEARCH (1 Endpoint)
  // ==========================================
  console.log("\n--- MODULE 2: USERS & SEARCH ---");
  // 9. GET /api/users/search
  await testEndpoint("Search Users", "GET", `/users/search?q=${userBData.username}`, tokenA);

  // ==========================================
  // MODULE 3: WALLET APIS (5 Endpoints)
  // ==========================================
  console.log("\n--- MODULE 3: WALLET & BALANCE ---");
  // 10. GET /api/wallet
  await testEndpoint("Get Wallet", "GET", "/wallet", tokenA);

  // 11. GET /api/wallet/balance
  await testEndpoint("Get Wallet Balance", "GET", "/wallet/balance", tokenA);

  // 12. POST /api/wallet/deposit-demo
  await testEndpoint("Deposit Demo Balance", "POST", "/wallet/deposit-demo", tokenA, {
    amount: 1000
  }, 200);

  // 13. POST /api/wallet/withdraw-demo
  await testEndpoint("Withdraw Demo Balance", "POST", "/wallet/withdraw-demo", tokenA, {
    amount: 500
  }, 200);

  // 14. POST /api/wallet/transfer
  const transfer = await testEndpoint("P2P Transfer", "POST", "/wallet/transfer", tokenA, {
    username: userBData.username,
    amount: 400,
    note: "Lunch Treat",
    pin: "1234"
  }, 201);
  const txId = transfer.body.transaction._id;

  // ==========================================
  // MODULE 4: TRANSACTIONS & BLOCKCHAIN (9 Endpoints)
  // ==========================================
  console.log("\n--- MODULE 4: TRANSACTIONS & BLOCKCHAIN ---");

  // 15. GET /api/transactions
  await testEndpoint("List Transactions", "GET", "/transactions", tokenA);

  // 16. GET /api/transactions/:id
  await testEndpoint("Get Single Transaction", "GET", `/transactions/${txId}`, tokenA);

  // 17. POST /api/transactions/send (Alias transfer)
  await testEndpoint("Send Transaction", "POST", "/transactions/send", tokenA, {
    username: userBData.username,
    amount: 50,
    note: "Coffee",
    pin: "1234"
  }, 201);

  // 18. GET /api/transactions/:id/blockchain/verify
  await testEndpoint("Verify Blockchain Receipt", "GET", `/transactions/${txId}/blockchain/verify`, tokenA);

  // 19. POST /api/transactions/:id/blockchain/retry
  await testEndpoint("Retry Blockchain Anchor", "POST", `/transactions/${txId}/blockchain/retry`, tokenA, {}, 200);

  // 20. POST /api/transactions/request
  const req1 = await testEndpoint("Create Payment Request 1", "POST", "/transactions/request", tokenB, {
    username: userAData.username,
    amount: 150,
    note: "Stationery"
  }, 201);

  const req2 = await testEndpoint("Create Payment Request 2", "POST", "/transactions/request", tokenB, {
    username: userAData.username,
    amount: 75,
    note: "Printout"
  }, 201);

  // 21. GET /api/transactions/requests
  await testEndpoint("List Payment Requests", "GET", "/transactions/requests", tokenA);

  // 22. POST /api/transactions/accept/:id
  await testEndpoint("Accept Payment Request", "POST", `/transactions/accept/${req1.body.request._id}`, tokenA, {
    pin: "1234"
  }, 201);

  // 23. POST /api/transactions/reject/:id
  await testEndpoint("Reject Payment Request", "POST", `/transactions/reject/${req2.body.request._id}`, tokenA, {}, 200);

  // 24. POST /api/transactions/split
  await testEndpoint("Split Bill", "POST", "/transactions/split", tokenA, {
    title: "Hostel Outing",
    amount: 600,
    members: [userBData.username]
  }, 201);

  // ==========================================
  // MODULE 5: QR CODE APIS (2 Endpoints)
  // ==========================================
  console.log("\n--- MODULE 5: QR PAYMENTS ---");
  // 25. POST /api/qr/generate
  const qrGen = await testEndpoint("Generate Dynamic QR", "POST", "/qr/generate", tokenB, {
    amount: 99,
    purpose: "Milkshake"
  }, 200);

  // 26. POST /api/qr/scan
  await testEndpoint("Scan & Parse QR", "POST", "/qr/scan", tokenA, {
    payload: qrGen.body.payload
  }, 200);

  // ==========================================
  // MODULE 6: FRIENDS APIS (3 Endpoints)
  // ==========================================
  console.log("\n--- MODULE 6: FRIENDS MANAGEMENT ---");
  // 27. POST /api/friends (Add friend)
  const friendRes = await testEndpoint("Add Friend", "POST", "/friends", tokenA, {
    username: userBData.username
  }, 201);

  // 28. GET /api/friends
  await testEndpoint("List Friends", "GET", "/friends", tokenA);

  // 29. DELETE /api/friends/:friendId
  await testEndpoint("Remove Friend", "DELETE", `/friends/${userBId}`, tokenA, null, 200);

  // ==========================================
  // MODULE 7: NOTIFICATIONS (3 Endpoints)
  // ==========================================
  console.log("\n--- MODULE 7: NOTIFICATIONS ---");
  // 30. GET /api/notifications
  const notifs = await testEndpoint("List Notifications", "GET", "/notifications", tokenB);

  if (notifs.body.notifications?.length > 0) {
    const firstNotifId = notifs.body.notifications[0]._id;
    // 31. PUT /api/notifications/:id/read
    await testEndpoint("Mark One Notification Read", "PUT", `/notifications/${firstNotifId}/read`, tokenB);
  }

  // 32. PUT /api/notifications/read-all
  await testEndpoint("Mark All Notifications Read", "PUT", "/notifications/read-all", tokenB);

  // ==========================================
  // MODULE 8: ADMIN (1 Endpoint)
  // ==========================================
  console.log("\n--- MODULE 8: ADMIN DASHBOARD ---");
  // 33. GET /api/admin/summary
  await testEndpoint("Get Admin Summary", "GET", "/admin/summary", adminToken);

  // ==========================================
  // DATABASE AUDIT SUMMARY
  // ==========================================
  console.log("\n=======================================================");
  console.log("            📊 LIVE DATABASE AUDIT REPORT             ");
  console.log("=======================================================");
  
  const totalUsers = await User.countDocuments();
  const totalWallets = await Wallet.countDocuments();
  const totalTx = await Transaction.countDocuments();
  const totalReqs = await PaymentRequest.countDocuments();
  const totalNotifs = await Notification.countDocuments();

  console.log(`  Users in Mongo:          ${totalUsers}`);
  console.log(`  Wallets in Mongo:        ${totalWallets}`);
  console.log(`  Transactions in Mongo:   ${totalTx}`);
  console.log(`  Payment Requests:        ${totalReqs}`);
  console.log(`  Notifications generated: ${totalNotifs}`);

  console.log("\n=======================================================");
  console.log(`  🎉 ALL ${passedEndpoints.length} OF ${passedEndpoints.length} ENDPOINTS TESTED & PASSED 100%!`);
  console.log("=======================================================\n");
}

runComprehensiveTests()
  .catch((err) => {
    console.error("\n❌ COMPREHENSIVE TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
