import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  approvePayout,
  getAuditLogs,
  getConfig,
  getDashboard,
  getMerchantDetails,
  listAllPayouts,
  listAllTransactions,
  listAllUsers,
  listDisputes,
  listMerchants,
  resolveDispute,
  suspendMerchant,
  updateConfig,
  verifyMerchant
} from "../controllers/authorityController.js";

const router = Router();

// Super Admin / Authority Protection: requireAuth + requireAdmin
router.use(requireAuth, requireAdmin);

// Global Performance & Metrics Dashboard
router.get("/dashboard", asyncHandler(getDashboard));

// 360-Degree User & Customer Explorer
router.get("/users", asyncHandler(listAllUsers));

// Global Transaction Ledger Explorer
router.get("/transactions", asyncHandler(listAllTransactions));

// Merchant KYC & Lifecycle Governance
router.get("/merchants", asyncHandler(listMerchants));
router.get("/merchants/:id", asyncHandler(getMerchantDetails));
router.patch("/merchants/:id/verify", asyncHandler(verifyMerchant));
router.patch("/merchants/:id/suspend", asyncHandler(suspendMerchant));

// Platform Payouts & Settlements
router.get("/payouts", asyncHandler(listAllPayouts));
router.patch("/payouts/:id/approve", asyncHandler(approvePayout));

// Disputes & Chargebacks
router.get("/disputes", asyncHandler(listDisputes));
router.post("/disputes/:id/resolve", asyncHandler(resolveDispute));

// Dynamic Platform Config & Commission Controls
router.get("/config", asyncHandler(getConfig));
router.put("/config", asyncHandler(updateConfig));

// Tamper-Evident Audit Logs
router.get("/audit-logs", asyncHandler(getAuditLogs));

export default router;
