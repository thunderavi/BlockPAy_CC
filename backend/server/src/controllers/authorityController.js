import { z } from "zod";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { Merchant } from "../models/Merchant.js";
import { MerchantOrder } from "../models/MerchantOrder.js";
import { MerchantStaff } from "../models/MerchantStaff.js";
import { Transaction } from "../models/Transaction.js";
import { Payout } from "../models/Payout.js";
import { Dispute } from "../models/Dispute.js";
import { AuditLog } from "../models/AuditLog.js";
import { getPlatformConfig, PlatformConfig } from "../models/PlatformConfig.js";
import { cache } from "../services/cacheService.js";

const updateConfigSchema = z.object({
  defaultCommissionRate: z.number().min(0).max(100).optional(),
  maxTransferLimit: z.number().min(100).optional(),
  dailyUserLimit: z.number().min(500).optional(),
  payoutApprovalThreshold: z.number().min(1000).optional(),
  maintenanceMode: z.boolean().optional()
});

const resolveDisputeSchema = z.object({
  resolution: z.enum(["refund", "reject"]),
  resolutionNotes: z.string().min(5)
});

/**
 * Super Admin Global Performance Dashboard
 */
export async function getDashboard(_req, res) {
  const cached = await cache.get("authority_dashboard_metrics");
  if (cached) {
    return res.json({ dashboard: cached, cached: true });
  }

  const [totalUsers, totalMerchants, totalOrders, volumeAgg, openDisputes, pendingPayouts] = await Promise.all([
    User.countDocuments(),
    Merchant.countDocuments(),
    MerchantOrder.countDocuments(),
    MerchantOrder.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, totalGmv: { $sum: "$amount" }, totalFees: { $sum: "$feeAmount" } } }
    ]),
    Dispute.countDocuments({ status: { $in: ["open", "under_review"] } }),
    Payout.countDocuments({ status: "processing" })
  ]);

  const stats = volumeAgg[0] || { totalGmv: 0, totalFees: 0 };

  const dashboard = {
    totalUsers,
    totalMerchants,
    totalOrders,
    totalGmv: Math.round(stats.totalGmv * 100) / 100,
    totalPlatformFeesEarned: Math.round(stats.totalFees * 100) / 100,
    openDisputes,
    pendingPayouts
  };

  await cache.set("authority_dashboard_metrics", dashboard, 10);
  res.json({ dashboard });
}

/**
 * List Merchants with Status Filters
 */
export async function listMerchants(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const merchants = await Merchant.find(query)
    .populate("userId", "name username email phone")
    .sort({ createdAt: -1 });

  res.json({ merchants });
}

/**
 * Approve / Verify a Merchant (KYC)
 */
export async function verifyMerchant(req, res) {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const oldStatus = merchant.status;
  merchant.status = "active";
  await merchant.save();

  await AuditLog.create({
    adminId: req.user.id,
    action: "merchant_verified",
    targetType: "Merchant",
    targetId: merchant._id.toString(),
    changes: { status: { from: oldStatus, to: "active" } },
    ipAddress: req.ip || "127.0.0.1"
  });

  res.json({ message: "Merchant approved and verified", merchant });
}

/**
 * Suspend / Freeze a Merchant
 */
export async function suspendMerchant(req, res) {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const oldStatus = merchant.status;
  merchant.status = "suspended";
  await merchant.save();

  await AuditLog.create({
    adminId: req.user.id,
    action: "merchant_suspended",
    targetType: "Merchant",
    targetId: merchant._id.toString(),
    changes: { status: { from: oldStatus, to: "suspended" } },
    ipAddress: req.ip || "127.0.0.1"
  });

  res.json({ message: "Merchant suspended", merchant });
}

/**
 * List All Platform Payouts
 */
export async function listAllPayouts(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const payouts = await Payout.find(query)
    .populate("merchantId", "businessName contactEmail walletBalances")
    .sort({ createdAt: -1 });

  res.json({ payouts });
}

/**
 * Approve and Settle a Merchant Payout
 */
export async function approvePayout(req, res) {
  const query = { $or: [{ payoutId: req.params.id }] };
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: req.params.id });
  }
  const payout = await Payout.findOne(query);
  if (!payout) {
    return res.status(404).json({ message: "Payout request not found" });
  }

  if (payout.status !== "processing" && payout.status !== "requested") {
    return res.status(400).json({ message: `Payout cannot be approved from status "${payout.status}"` });
  }

  const merchant = await Merchant.findById(payout.merchantId);
  if (!merchant) {
    return res.status(404).json({ message: "Associated merchant not found" });
  }

  // Finalize settlement
  merchant.walletBalances.pendingSettlement = Math.max(
    0,
    Math.round((merchant.walletBalances.pendingSettlement - payout.amount) * 100) / 100
  );
  merchant.walletBalances.totalSettled =
    Math.round((merchant.walletBalances.totalSettled + payout.amount) * 100) / 100;
  await merchant.save();

  payout.status = "completed";
  payout.approvedBy = req.user.id;
  payout.bankReferenceNumber = `UTR-${Date.now().toString().slice(-8)}`;
  await payout.save();

  await AuditLog.create({
    adminId: req.user.id,
    action: "payout_approved",
    targetType: "Payout",
    targetId: payout._id.toString(),
    changes: { amount: payout.amount, bankReferenceNumber: payout.bankReferenceNumber },
    ipAddress: req.ip || "127.0.0.1"
  });

  res.json({ message: "Payout approved and settled", payout });
}

/**
 * List Customer Disputes
 */
export async function listDisputes(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const disputes = await Dispute.find(query)
    .populate("customerId", "name username email")
    .populate("merchantId", "businessName")
    .sort({ createdAt: -1 });

  res.json({ disputes });
}

/**
 * Resolve Customer Dispute
 */
export async function resolveDispute(req, res) {
  const { resolution, resolutionNotes } = resolveDisputeSchema.parse(req.body);
  const dispute = await Dispute.findById(req.params.id);
  if (!dispute) {
    return res.status(404).json({ message: "Dispute not found" });
  }

  dispute.status = resolution === "refund" ? "resolved_refunded" : "resolved_rejected";
  dispute.resolutionNotes = resolutionNotes;
  dispute.resolvedBy = req.user.id;
  await dispute.save();

  await AuditLog.create({
    adminId: req.user.id,
    action: "dispute_resolved",
    targetType: "Dispute",
    targetId: dispute._id.toString(),
    changes: { status: dispute.status, notes: resolutionNotes },
    ipAddress: req.ip || "127.0.0.1"
  });

  res.json({ message: `Dispute resolved as ${dispute.status}`, dispute });
}

/**
 * Get Platform Configuration Settings
 */
export async function getConfig(_req, res) {
  const cached = await cache.get("platform_config");
  if (cached) {
    return res.json({ config: cached, cached: true });
  }

  const config = await getPlatformConfig();
  await cache.set("platform_config", config, 300);
  res.json({ config });
}

/**
 * Update Platform Settings (Commission, Caps, Maintenance)
 */
export async function updateConfig(req, res) {
  const data = updateConfigSchema.parse(req.body);
  const config = await getPlatformConfig();

  const oldValues = { ...config.toObject() };
  if (data.defaultCommissionRate !== undefined) config.defaultCommissionRate = data.defaultCommissionRate;
  if (data.maxTransferLimit !== undefined) config.maxTransferLimit = data.maxTransferLimit;
  if (data.dailyUserLimit !== undefined) config.dailyUserLimit = data.dailyUserLimit;
  if (data.payoutApprovalThreshold !== undefined) config.payoutApprovalThreshold = data.payoutApprovalThreshold;
  if (data.maintenanceMode !== undefined) config.maintenanceMode = data.maintenanceMode;

  await config.save();
  await cache.del("platform_config");

  await AuditLog.create({
    adminId: req.user.id,
    action: "config_updated",
    targetType: "PlatformConfig",
    targetId: config._id.toString(),
    changes: { before: oldValues, after: config.toObject() },
    ipAddress: req.ip || "127.0.0.1"
  });

  res.json({ message: "Platform configuration updated", config });
}

/**
 * View Immutable Audit Logs
 */
export async function getAuditLogs(_req, res) {
  const logs = await AuditLog.find()
    .populate("adminId", "name username email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ auditLogs: logs });
}

/**
 * 360-Degree Deep Dive into a Single Merchant
 */
export async function getMerchantDetails(req, res) {
  const merchant = await Merchant.findById(req.params.id).populate("userId", "name username email phone");
  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const [orders, staff, payouts] = await Promise.all([
    MerchantOrder.find({ merchantId: merchant._id }).sort({ createdAt: -1 }).limit(20),
    MerchantStaff.find({ merchantId: merchant._id, isActive: true }).populate("userId", "name username email"),
    Payout.find({ merchantId: merchant._id }).sort({ createdAt: -1 }).limit(10)
  ]);

  res.json({
    merchant,
    orders,
    staff,
    payouts
  });
}

/**
 * View All Registered Users with Live Balances & Ledger Stats
 */
export async function listAllUsers(req, res) {
  const users = await User.find().select("-passwordHash -pinHash").sort({ createdAt: -1 });

  const userIds = users.map((u) => u._id);
  const wallets = await Wallet.find({ userId: { $in: userIds } });
  const walletMap = new Map(wallets.map((w) => [w.userId.toString(), w]));

  const enrichedUsers = users.map((u) => {
    const w = walletMap.get(u._id.toString());
    return {
      id: u._id,
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      balance: w ? w.balance : 0,
      walletNumber: w ? w.walletNumber : "N/A",
      createdAt: u.createdAt
    };
  });

  res.json({ users: enrichedUsers, totalCount: enrichedUsers.length });
}

/**
 * Global Transaction Explorer across P2P and Merchant Checkout
 */
export async function listAllTransactions(req, res) {
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const transactions = await Transaction.find(query)
    .populate("senderId", "name username email")
    .populate("receiverId", "name username email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ transactions, count: transactions.length });
}

