import crypto from "crypto";
import { z } from "zod";
import { Merchant } from "../models/Merchant.js";
import { ApiKey } from "../models/ApiKey.js";
import { MerchantStaff } from "../models/MerchantStaff.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { offloadedHash } from "../workers/cryptoPool.js";

const onboardSchema = z.object({
  businessName: z.string().min(2),
  businessType: z.enum(["retail_store", "food_dining", "online_store", "campus_service", "event_organizer", "other"]).default("retail_store"),
  registrationNumber: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(7),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  upiId: z.string().optional()
});

const updateProfileSchema = z.object({
  businessName: z.string().min(2).optional(),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  bankAccountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  bankName: z.string().optional(),
  upiId: z.string().optional()
});

const createApiKeySchema = z.object({
  name: z.string().min(1).default("Production Key")
});

const addStaffSchema = z.object({
  username: z.string().min(3),
  counterName: z.string().min(1),
  role: z.enum(["cashier", "manager"]).default("cashier")
});

// Helper to generate cryptographically secure keys
function generateKeyPair() {
  const pubRand = crypto.randomBytes(16).toString("hex");
  const secRand = crypto.randomBytes(24).toString("hex");
  const publishableKey = `pk_live_${pubRand}`;
  const secretKey = `sk_live_${secRand}`;
  const secretKeyPrefix = secretKey.slice(0, 16);
  return { publishableKey, secretKey, secretKeyPrefix };
}

/**
 * Register as a Merchant & Auto-generate First API Key
 */
export async function onboardMerchant(req, res) {
  const data = onboardSchema.parse(req.body);
  const existing = await Merchant.findOne({ userId: req.user.id });
  if (existing) {
    return res.status(409).json({ message: "User is already registered as a merchant" });
  }

  const webhookSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

  const merchant = await Merchant.create({
    userId: req.user.id,
    businessName: data.businessName,
    businessType: data.businessType,
    registrationNumber: data.registrationNumber || "",
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    description: data.description || "",
    webhookUrl: data.webhookUrl || "",
    webhookSecret,
    settlementDetails: {
      bankAccountNumber: data.bankAccountNumber || "",
      ifscCode: data.ifscCode || "",
      bankName: data.bankName || "",
      upiId: data.upiId || ""
    }
  });

  // Generate initial API key pair
  const { publishableKey, secretKey, secretKeyPrefix } = generateKeyPair();
  const secretKeyHash = await offloadedHash(secretKey, 10);

  const initialKey = await ApiKey.create({
    merchantId: merchant._id,
    name: "Default Live Key",
    publishableKey,
    secretKeyHash,
    secretKeyPrefix
  });

  res.status(201).json({
    message: "Merchant account registered successfully",
    merchant,
    apiKeys: {
      id: initialKey._id,
      name: initialKey.name,
      publishableKey,
      secretKey, // Returned ONLY ONCE on creation!
      warning: "Save this secret key securely. It will not be shown again."
    }
  });
}

/**
 * Get Merchant Profile & Verification Status
 */
export async function getProfile(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found. Please onboard first." });
  }

  const staffCount = await MerchantStaff.countDocuments({ merchantId: merchant._id, isActive: true });
  res.json({ merchant, staffCount });
}

/**
 * Update Merchant Profile & Webhook Settings
 */
export async function updateProfile(req, res) {
  const data = updateProfileSchema.parse(req.body);
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  if (data.businessName) merchant.businessName = data.businessName;
  if (data.description !== undefined) merchant.description = data.description;
  if (data.webhookUrl !== undefined) merchant.webhookUrl = data.webhookUrl;

  if (data.bankAccountNumber !== undefined) merchant.settlementDetails.bankAccountNumber = data.bankAccountNumber;
  if (data.ifscCode !== undefined) merchant.settlementDetails.ifscCode = data.ifscCode;
  if (data.bankName !== undefined) merchant.settlementDetails.bankName = data.bankName;
  if (data.upiId !== undefined) merchant.settlementDetails.upiId = data.upiId;

  await merchant.save();
  res.json({ message: "Merchant profile updated", merchant });
}

/**
 * Get Merchant Analytics & Revenue
 */
export async function getAnalytics(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  res.json({
    analytics: {
      businessName: merchant.businessName,
      status: merchant.status,
      balances: merchant.walletBalances,
      commissionRate: merchant.commissionRate
    }
  });
}

/**
 * Create a New API Key
 */
export async function createApiKey(req, res) {
  const data = createApiKeySchema.parse(req.body);
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const { publishableKey, secretKey, secretKeyPrefix } = generateKeyPair();
  const secretKeyHash = await offloadedHash(secretKey, 10);

  const keyDoc = await ApiKey.create({
    merchantId: merchant._id,
    name: data.name,
    publishableKey,
    secretKeyHash,
    secretKeyPrefix
  });

  res.status(201).json({
    apiKey: {
      id: keyDoc._id,
      name: keyDoc.name,
      publishableKey,
      secretKey,
      createdAt: keyDoc.createdAt,
      warning: "Save this secret key securely. It will not be shown again."
    }
  });
}

/**
 * List Merchant API Keys
 */
export async function listApiKeys(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const keys = await ApiKey.find({ merchantId: merchant._id })
    .select("name publishableKey secretKeyPrefix isActive lastUsedAt createdAt")
    .sort({ createdAt: -1 });

  res.json({ apiKeys: keys });
}

/**
 * Revoke an API Key
 */
export async function revokeApiKey(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const key = await ApiKey.findOneAndUpdate(
    { _id: req.params.id, merchantId: merchant._id },
    { isActive: false },
    { new: true }
  );

  if (!key) {
    return res.status(404).json({ message: "API key not found" });
  }

  res.json({ message: "API key revoked successfully", apiKey: key });
}

/**
 * Add Cashier / Staff Member to Merchant
 */
export async function addStaff(req, res) {
  const data = addStaffSchema.parse(req.body);
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const staffUser = await User.findOne({ username: data.username.toLowerCase() });
  if (!staffUser) {
    return res.status(404).json({ message: `User @${data.username} not found` });
  }

  const existing = await MerchantStaff.findOne({ merchantId: merchant._id, userId: staffUser._id });
  if (existing) {
    return res.status(409).json({ message: "User is already assigned as staff for this merchant" });
  }

  const staff = await MerchantStaff.create({
    merchantId: merchant._id,
    userId: staffUser._id,
    counterName: data.counterName,
    role: data.role
  });

  res.status(201).json({
    message: `Staff @${data.username} added successfully to ${data.counterName}`,
    staff: {
      id: staff._id,
      username: staffUser.username,
      name: staffUser.name,
      counterName: staff.counterName,
      role: staff.role
    }
  });
}

/**
 * List Cashiers & Staff
 */
export async function listStaff(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const staffList = await MerchantStaff.find({ merchantId: merchant._id, isActive: true })
    .populate("userId", "name username email avatar")
    .sort({ createdAt: -1 });

  res.json({ staff: staffList });
}

/**
 * Remove Staff Member
 */
export async function removeStaff(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const staff = await MerchantStaff.findOneAndUpdate(
    { _id: req.params.id, merchantId: merchant._id },
    { isActive: false },
    { new: true }
  );

  if (!staff) {
    return res.status(404).json({ message: "Staff member not found" });
  }

  res.json({ message: "Staff member removed successfully" });
}
