import axios from "axios";
import { Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function getAutoDetectedHost() {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/) || scriptURL.match(/exp:\/\/([^/:]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (Platform.OS === "android" && (host === "localhost" || host === "127.0.0.1")) {
        return "10.0.2.2";
      }
      return host;
    }
  }
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes("192.168.1.3")) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.hostname) return parsed.hostname;
    } catch {}
  }
  return "192.168.1.2";
}

export const API_BASE_URL = `http://${getAutoDetectedHost()}:5000/api`;

const client = axios.create({ baseURL: API_BASE_URL, timeout: 12000, headers: { "Content-Type": "application/json" } });
let token = ""; let unauthorizedHandler = null;
export function setAuthToken(value) { token = value || ""; }
export function setUnauthorizedHandler(handler) { unauthorizedHandler = handler; }
client.interceptors.request.use((config) => {
  const host = getAutoDetectedHost();
  config.baseURL = `http://${host}:5000/api`;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) unauthorizedHandler?.();
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return Promise.reject(new Error(serverMessage));
    if (error.code === "ECONNABORTED") return Promise.reject(new Error("The server took too long to respond."));
    const activeBase = error.config?.baseURL || API_BASE_URL;
    return Promise.reject(new Error(`Unable to connect to BlockPay API (${activeBase}). Please verify your network and server.`));
  }
);
const liveApi = {
  health: () => client.get("/health"), register: (p) => client.post("/auth/register", p), login: (p) => client.post("/auth/login", p), forgotPassword: (p) => client.post("/auth/forgot-password", p), logout: () => client.post("/auth/logout"), profile: () => client.get("/auth/profile"), updateProfile: (p) => client.put("/auth/profile", p), changePin: (p) => client.post("/auth/change-pin", p),
  searchUsers: (q) => client.get("/users/search", { params: { q } }), wallet: () => client.get("/wallet/balance"), transfer: (p) => client.post("/wallet/transfer", p), depositDemo: (amount) => client.post("/wallet/deposit-demo", { amount }), withdrawDemo: (amount) => client.post("/wallet/withdraw-demo", { amount }),
  transactions: (filter = "all") => client.get("/transactions", { params: { filter } }), transaction: (id) => client.get(`/transactions/${id}`), verifyBlockchain: (id) => client.get(`/transactions/${id}/blockchain/verify`), retryBlockchain: (id) => client.post(`/transactions/${id}/blockchain/retry`, {}), requests: () => client.get("/transactions/requests"), requestPayment: (p) => client.post("/transactions/request", p), acceptRequest: (id, pin) => client.post(`/transactions/accept/${id}`, { pin }), rejectRequest: (id) => client.post(`/transactions/reject/${id}`, {}), splitBill: (p) => client.post("/transactions/split", p),
  friends: () => client.get("/friends"), addFriend: (username) => client.post("/friends", { username }), removeFriend: (id) => client.delete(`/friends/${id}`), notifications: () => client.get("/notifications"), readNotification: (id) => client.put(`/notifications/${id}/read`, {}), readAllNotifications: () => client.put("/notifications/read-all", {}),
  generateQr: (p) => client.post("/qr/generate", p), scanQr: (payload) => client.post("/qr/scan", { payload }), adminSummary: () => client.get("/admin/summary"),
};

const demoUser = { _id: "demo-user", name: "Demo Student", email: "demo@blockpay.app", phone: "9876543210", username: "demo", collegeId: "BP-DEMO-01", bio: "Exploring the BlockPay mobile experience.", role: "admin" };
const receiverUser = { _id: "demo-receiver", name: "Riya Receiver", email: "riya@blockpay.app", phone: "9876500002", username: "riya", collegeId: "BP-DEMO-02", bio: "Second BlockPay demo account.", role: "student" };
const friendUser = { _id: "demo-friend", name: "Aarav Sharma", username: "aarav", avatar: "", collegeId: "CSE-204" };
const priyaUser = { _id: "demo-priya", name: "Priya Nair", username: "priya", avatar: "", collegeId: "ECE-118" };
const kabirUser = { _id: "demo-kabir", name: "Kabir Mehta", username: "kabir", avatar: "", collegeId: "IT-072" };
const canteenUser = { _id: "demo-canteen", name: "Campus Canteen", username: "canteen", avatar: "", collegeId: "MERCHANT-01" };
const ago = (hours) => new Date(Date.now() - hours * 3600000).toISOString();
let activeDemoUser = demoUser;
let demoWallets = {
  [demoUser._id]: { _id:"demo-wallet",userId:demoUser._id,walletNumber:"BP 4082 6175 90",balance:12750.50 },
  [receiverUser._id]: { _id:"receiver-wallet",userId:receiverUser._id,walletNumber:"BP 7301 2846 11",balance:8000 },
};
let demoTransactions = [
  { _id:"demo-tx-1",senderId:friendUser,receiverId:demoUser,amount:850,note:"Hackathon lunch refund",status:"successful",referenceId:"BP-DEMO-001",hash:"a".repeat(64),previousHash:"GENESIS",metadata:{blockchainStatus:"not_anchored"},createdAt:ago(1) },
  { _id:"demo-tx-2",senderId:demoUser,receiverId:canteenUser,amount:185,note:"Lunch combo",status:"successful",referenceId:"BP-DEMO-002",hash:"b".repeat(64),previousHash:"a".repeat(64),metadata:{blockchainStatus:"not_anchored"},createdAt:ago(4) },
  { _id:"demo-tx-3",senderId:demoUser,receiverId:priyaUser,amount:420,note:"Design workshop tickets",status:"successful",referenceId:"BP-DEMO-003",hash:"c".repeat(64),previousHash:"b".repeat(64),metadata:{blockchainStatus:"not_anchored"},createdAt:ago(26) },
  { _id:"demo-tx-4",senderId:kabirUser,receiverId:demoUser,amount:1200,note:"Project equipment share",status:"successful",referenceId:"BP-DEMO-004",hash:"d".repeat(64),previousHash:"c".repeat(64),metadata:{blockchainStatus:"not_anchored"},createdAt:ago(72) },
  { _id:"demo-tx-5",senderId:demoUser,receiverId:friendUser,amount:299,note:"Movie night",status:"successful",referenceId:"BP-DEMO-005",hash:"e".repeat(64),previousHash:"d".repeat(64),metadata:{blockchainStatus:"not_anchored"},createdAt:ago(144) },
  { _id:"demo-tx-6",senderId:demoUser,receiverId:canteenUser,amount:95.5,note:"Coffee and snack",status:"successful",referenceId:"BP-DEMO-006",hash:"f".repeat(64),previousHash:"e".repeat(64),metadata:{blockchainStatus:"not_anchored"},createdAt:ago(360) },
];
let demoRequests = [
  { _id:"demo-request-1",requesterId:friendUser,payerId:demoUser,amount:240,note:"Coffee split",status:"pending",createdAt:ago(2) },
  { _id:"demo-request-2",requesterId:demoUser,payerId:priyaUser,amount:650,note:"Fest registration",status:"pending",createdAt:ago(18) },
  { _id:"demo-request-3",requesterId:kabirUser,payerId:demoUser,amount:120,note:"Cab share",status:"accepted",createdAt:ago(48) },
];
let demoNotifications = [
  { _id:"demo-note-1",userId:demoUser._id,title:"Payment received",message:"Aarav sent you INR 850 for Hackathon lunch refund.",type:"payment",read:false,createdAt:ago(1) },
  { _id:"demo-note-2",userId:demoUser._id,title:"New payment request",message:"Aarav requested INR 240 for Coffee split.",type:"request",read:false,createdAt:ago(2) },
  { _id:"demo-note-3",userId:demoUser._id,title:"Receipt ready",message:"Your canteen payment receipt is ready to verify.",type:"receipt",read:true,createdAt:ago(4) },
  { _id:"demo-note-4",userId:receiverUser._id,title:"Welcome, Riya",message:"Your second demo wallet is ready to receive a test payment.",type:"info",read:false,createdAt:ago(30) },
];
let demoFriends = [
  { _id:"demo-friend-link",friendId:friendUser,favorite:true },
  { _id:"demo-priya-link",friendId:priyaUser,favorite:true },
  { _id:"demo-kabir-link",friendId:kabirUser,favorite:false },
  { _id:"demo-canteen-link",friendId:canteenUser,favorite:false },
];
const wait = (value) => new Promise((resolve) => setTimeout(() => resolve(value), 180));
const demoUsers = [demoUser, receiverUser, friendUser, priyaUser, kabirUser, canteenUser];
const currentWallet = () => demoWallets[activeDemoUser._id];
const DEMO_LEDGER_KEY = "blockpay_demo_ledger_v2";
let demoLedgerLoaded = false;
async function loadDemoLedger(){if(demoLedgerLoaded)return;demoLedgerLoaded=true;try{const saved=await AsyncStorage.getItem(DEMO_LEDGER_KEY);if(!saved)return;const state=JSON.parse(saved);if(state.wallets&&Array.isArray(state.transactions)&&Array.isArray(state.notifications)){demoWallets=state.wallets;demoTransactions=state.transactions;demoNotifications=state.notifications}}catch{}}
async function saveDemoLedger(){await AsyncStorage.setItem(DEMO_LEDGER_KEY,JSON.stringify({wallets:demoWallets,transactions:demoTransactions,notifications:demoNotifications}))}
export const demoApi = {
  health: () => wait({ ok: true, service: "BlockPay Demo" }),
  login: async ({ email, password }) => { const found=[{user:demoUser,password:"demo123"},{user:receiverUser,password:"riya123"}].find(x=>x.user.email===email.toLowerCase().trim()&&x.password===password);if(!found)throw new Error("Use one of the demo accounts shown above.");await loadDemoLedger();activeDemoUser=found.user;return wait({token:`blockpay-demo-token-${found.user._id}`,user:found.user}); },
  register: (payload) => { const user = { ...demoUser, ...payload, _id: `demo-${Date.now()}`, role: "student", pin: payload.pin || "1234", avatar: payload.avatar || "" }; activeDemoUser = user; return wait({ token: "blockpay-demo-token", user }); },
  forgotPassword: () => wait({ message: "Demo OTP generated.", otp: "246810" }), logout: () => wait({ message: "Logged out" }), profile: () => wait({ user: activeDemoUser }),
  changePin: async ({ currentPin, newPin }) => { if ((activeDemoUser.pin || "1234") !== currentPin) throw new Error("Current payment PIN is incorrect"); activeDemoUser.pin = newPin; return wait({ message: "Payment PIN changed successfully" }); },
  updateProfile: (payload) => { activeDemoUser={...activeDemoUser,...payload};return wait({user:activeDemoUser}); }, searchUsers: () => wait({ users: demoUsers.filter(x=>x._id!==activeDemoUser._id) }), wallet: () => wait({ wallet: currentWallet() }),
  depositDemo: async (amount) => { const wallet=currentWallet();demoWallets[activeDemoUser._id]={...wallet,balance:wallet.balance+Number(amount)};await saveDemoLedger();return wait({wallet:currentWallet()}); },
  withdrawDemo: async (amount) => { const wallet=currentWallet();if(Number(amount)>wallet.balance)throw new Error("Insufficient demo balance");demoWallets[activeDemoUser._id]={...wallet,balance:wallet.balance-Number(amount)};await saveDemoLedger();return wait({wallet:currentWallet()}); },
  transfer: async (payload) => { const amount=Number(payload.amount),senderWallet=currentWallet(),receiver=demoUsers.find(x=>x.username===payload.username.replace("@",""));if(payload.pin!==(activeDemoUser.pin||"1234"))throw new Error("Invalid payment PIN");if(!receiver)throw new Error("Demo receiver not found");if(receiver._id===activeDemoUser._id)throw new Error("You cannot pay yourself");if(!Number.isFinite(amount)||amount<=0)throw new Error("Enter a valid amount");if(amount>senderWallet.balance)throw new Error("Insufficient demo balance");if(!demoWallets[receiver._id])demoWallets[receiver._id]={_id:`wallet-${receiver._id}`,userId:receiver._id,walletNumber:`BP DEMO ${receiver.username.toUpperCase()}`,balance:5000};demoWallets[activeDemoUser._id]={...senderWallet,balance:senderWallet.balance-amount};demoWallets[receiver._id]={...demoWallets[receiver._id],balance:demoWallets[receiver._id].balance+amount};const stamp=Date.now(),tx={_id:`demo-tx-${stamp}`,senderId:activeDemoUser,receiverId:receiver,amount,note:payload.note||"Demo payment",status:"successful",referenceId:`BP-DEMO-${stamp}`,hash:"9".repeat(64),previousHash:demoTransactions[0]?.hash||"GENESIS",metadata:{blockchainStatus:"not_anchored"},createdAt:new Date().toISOString()};demoTransactions=[tx,...demoTransactions];demoNotifications=[{_id:`note-${stamp}`,userId:receiver._id,title:"Payment received",message:`${activeDemoUser.name} sent you INR ${amount.toLocaleString("en-IN")}.`,type:"payment",read:false,createdAt:tx.createdAt},...demoNotifications];await saveDemoLedger();return wait({transaction:tx,wallet:currentWallet()}); },
  transactions: () => wait({ transactions: demoTransactions.filter(x=>x.senderId?._id===activeDemoUser._id||x.receiverId?._id===activeDemoUser._id) }), transaction: (id) => wait({ transaction: demoTransactions.find((x) => x._id === id) || demoTransactions[0] }), requests: () => wait({ requests: demoRequests.filter(x=>x.requesterId?._id===activeDemoUser._id||x.payerId?._id===activeDemoUser._id) }),
  requestPayment: (payload) => { demoRequests = [{ _id: `demo-request-${Date.now()}`, requesterId: demoUser, payerId: friendUser, amount: Number(payload.amount), note: payload.note, status: "pending" }, ...demoRequests]; return wait({ request: demoRequests[0] }); },
  acceptRequest: (id) => { demoRequests = demoRequests.map((x) => x._id === id ? { ...x, status: "accepted" } : x); return wait({ request: demoRequests.find((x) => x._id === id) }); }, rejectRequest: (id) => { demoRequests = demoRequests.map((x) => x._id === id ? { ...x, status: "rejected" } : x); return wait({ request: demoRequests.find((x) => x._id === id) }); },
  splitBill: (payload) => wait({ perHead: Math.ceil((Number(payload.amount) / (payload.members.length + 1)) * 100) / 100, requests: payload.members.map((username, index) => ({ _id: `split-${index}`, username })) }),
  friends: () => wait({ friends: demoFriends }), addFriend: () => wait({ friend: demoFriends[0] }), removeFriend: () => { demoFriends = []; return wait(null); },
  notifications: () => wait({ notifications: demoNotifications.filter(x=>x.userId===activeDemoUser._id) }), readNotification: (id) => { demoNotifications = demoNotifications.map((x) => x._id === id ? { ...x, read: true } : x); return wait({ notification: demoNotifications.find((x) => x._id === id) }); }, readAllNotifications: () => { demoNotifications = demoNotifications.map((x) => x.userId===activeDemoUser._id?{...x,read:true}:x); return wait({ message: "Notifications marked as read" }); },
  verifyBlockchain: () => wait({blockchain:{available:false,verified:false,status:"not_configured",message:"Demo receipts are not submitted on-chain"}}), retryBlockchain: (id) => wait({transaction:demoTransactions.find(x=>x._id===id)}),
  generateQr: (payload) => wait({ payload: { type: "BLOCKPAY_QR", username: activeDemoUser.username, ...payload } }), scanQr: (payload) => { const parsed = typeof payload === "string" ? JSON.parse(payload) : payload; return wait({ username: parsed.username, amount: parsed.amount || "", note: parsed.purpose || "" }); },
  adminSummary: () => wait({ totalUsers: 24, totalPayments: demoTransactions.length, totalVolume: demoTransactions.reduce((sum, x) => sum + x.amount, 0), latestTransactions: demoTransactions, fraudAlerts: [] }),
};

export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === "true";
export const api = DEMO_MODE ? demoApi : liveApi;
