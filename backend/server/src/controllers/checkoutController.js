import crypto from "crypto";
import { z } from "zod";
import { Merchant } from "../models/Merchant.js";
import { MerchantOrder } from "../models/MerchantOrder.js";
import { PaymentLink } from "../models/PaymentLink.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { anchorTransaction, createProofPayload } from "../services/blockchainService.js";
import { dispatchWebhook } from "../services/webhookService.js";
import { offloadedCompare } from "../workers/cryptoPool.js";

const createOrderSchema = z.object({
  amount: z.number().min(1),
  currency: z.string().default("INR"),
  merchantReference: z.string().optional(),
  description: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  expiresInMinutes: z.number().min(5).max(1440).default(30)
});

const payOrderSchema = z.object({
  orderId: z.string().min(1),
  pin: z.string().min(4)
});

const createPaymentLinkSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  amount: z.number().min(0).default(0), // 0 allows customer to type custom amount
  isReusable: z.boolean().default(true),
  maxPayments: z.number().min(0).default(0)
});

/**
 * Developer Gateway: Create a Payment Order / Checkout Session
 */
export async function createOrder(req, res) {
  const data = createOrderSchema.parse(req.body);
  const merchant = req.merchant;

  const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || null;
  if (idempotencyKey) {
    const existingOrder = await MerchantOrder.findOne({ idempotencyKey, merchantId: merchant._id });
    if (existingOrder) {
      return res.status(200).json({ order: existingOrder, reusedIdempotency: true });
    }
  }

  const commissionRate = merchant.commissionRate || 1.5;
  const feeAmount = Math.round((data.amount * (commissionRate / 100)) * 100) / 100;
  const netAmount = Math.round((data.amount - feeAmount) * 100) / 100;

  const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + data.expiresInMinutes * 60 * 1000);

  const order = await MerchantOrder.create({
    orderId,
    merchantId: merchant._id,
    merchantReference: data.merchantReference || "",
    amount: data.amount,
    feeAmount,
    netAmount,
    currency: data.currency || "INR",
    description: data.description || "",
    customer: {
      email: data.customerEmail || "",
      phone: data.customerPhone || ""
    },
    expiresAt,
    idempotencyKey
  });

  res.status(201).json({
    message: "Checkout order created",
    order: {
      id: order._id,
      orderId: order.orderId,
      amount: order.amount,
      feeAmount: order.feeAmount,
      netAmount: order.netAmount,
      currency: order.currency,
      status: order.status,
      expiresAt: order.expiresAt,
      checkoutUrl: `/checkout/${order.orderId}`
    }
  });
}

/**
 * Developer Gateway: Query Order Status
 */
export async function getOrder(req, res) {
  const query = {
    merchantId: req.merchant._id,
    $or: [{ orderId: req.params.id }]
  };
  if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: req.params.id });
  }

  const order = await MerchantOrder.findOne(query);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.json({ order });
}

/**
 * Public Checkout Session Endpoint (For Web Checkout UI & QR Code)
 */
export async function getCheckoutSession(req, res) {
  const order = await MerchantOrder.findOne({ orderId: req.params.orderId }).populate("merchantId", "businessName businessType");
  if (!order) {
    return res.status(404).json({ message: "Checkout order not found" });
  }

  const isExpired = new Date() > new Date(order.expiresAt);
  if (isExpired && order.status === "created") {
    order.status = "expired";
    await order.save();
  }

  res.json({
    orderId: order.orderId,
    businessName: order.merchantId.businessName,
    businessType: order.merchantId.businessType,
    amount: order.amount,
    currency: order.currency,
    description: order.description,
    status: order.status,
    expiresAt: order.expiresAt,
    receiptHash: order.receiptHash,
    blockchainTxHash: order.blockchainTxHash
  });
}

/**
 * Customer Approval: Pay Order with BlockPay Wallet & PIN
 */
export async function payOrder(req, res) {
  const { orderId, pin } = payOrderSchema.parse(req.body);
  const user = await User.findById(req.user.id);
  if (!user || !(await offloadedCompare(pin, user.pinHash))) {
    return res.status(403).json({ message: "Incorrect transaction PIN" });
  }

  const order = await MerchantOrder.findOne({ orderId });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "created") {
    return res.status(400).json({ message: `Cannot pay order in status "${order.status}"` });
  }

  if (new Date() > new Date(order.expiresAt)) {
    order.status = "expired";
    await order.save();
    return res.status(400).json({ message: "Order checkout session has expired" });
  }

  const merchant = await Merchant.findById(order.merchantId);
  if (!merchant || merchant.status === "suspended") {
    return res.status(400).json({ message: "Merchant account is unavailable for payments" });
  }

  const customerWallet = await Wallet.findOne({ userId: user._id });
  if (!customerWallet || customerWallet.balance < order.amount) {
    return res.status(400).json({ message: "Insufficient wallet balance" });
  }

  // Deduct customer wallet balance
  customerWallet.balance = Math.round((customerWallet.balance - order.amount) * 100) / 100;
  await customerWallet.save();

  // Credit merchant available balance
  merchant.walletBalances.availableBalance =
    Math.round((merchant.walletBalances.availableBalance + order.netAmount) * 100) / 100;
  await merchant.save();

  // Create hash-linked proof payload
  const proof = await createProofPayload({
    sender: user,
    receiver: { username: merchant.businessName.replace(/\s+/g, "_").toLowerCase() },
    amount: order.amount,
    note: order.description || `Payment for ${order.orderId}`
  });

  // Create immutable Transaction ledger record
  const transaction = await Transaction.create({
    senderId: user._id,
    receiverId: merchant.userId,
    amount: order.amount,
    note: order.description || `Merchant Checkout: ${order.orderId}`,
    status: "successful",
    hash: proof.hash,
    previousHash: proof.previousHash,
    referenceId: proof.referenceId,
    metadata: {
      orderId: order.orderId,
      merchantId: merchant._id,
      feeAmount: order.feeAmount,
      netAmount: order.netAmount
    }
  });

  // Anchor to Solidity contract asynchronously
  let anchoredTx = transaction;
  try {
    anchoredTx = await anchorTransaction(transaction);
  } catch {
    // Non-fatal if blockchain fails; receipt remains safe in DB
  }

  // Update order record
  order.status = "paid";
  order.paymentTxId = transaction._id;
  order.receiptHash = proof.hash;
  order.blockchainTxHash = anchoredTx.metadata?.blockchainTxHash || null;
  order.customer.userId = user._id;
  await order.save();

  // Dispatch webhook event to external store
  dispatchWebhook(order, merchant, "order.paid").catch(() => {});

  // Send notifications
  await Notification.create({
    userId: user._id,
    title: "Payment Successful",
    type: "payment",
    message: `Paid ₹${order.amount} to ${merchant.businessName}`
  });

  res.status(200).json({
    message: "Payment successful",
    orderId: order.orderId,
    amount: order.amount,
    status: "paid",
    referenceId: transaction.referenceId,
    receiptHash: proof.hash,
    blockchainTxHash: order.blockchainTxHash
  });
}

/**
 * Create a Shareable Payment Link
 */
export async function createPaymentLink(req, res) {
  const data = createPaymentLinkSchema.parse(req.body);
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const linkId = `PL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  const link = await PaymentLink.create({
    linkId,
    merchantId: merchant._id,
    title: data.title,
    description: data.description || "",
    amount: data.amount || 0,
    isReusable: data.isReusable,
    maxPayments: data.maxPayments || 0
  });

  res.status(201).json({
    message: "Payment link generated",
    link: {
      id: link._id,
      linkId: link.linkId,
      title: link.title,
      amount: link.amount,
      url: `/pay/${link.linkId}`
    }
  });
}

/**
 * List Merchant Payment Links
 */
export async function listPaymentLinks(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const links = await PaymentLink.find({ merchantId: merchant._id, isActive: true }).sort({ createdAt: -1 });
  res.json({ paymentLinks: links });
}

/**
 * Get Public Payment Link Details
 */
export async function getPaymentLinkPublic(req, res) {
  const link = await PaymentLink.findOne({ linkId: req.params.linkId, isActive: true }).populate("merchantId", "businessName");
  if (!link) {
    return res.status(404).json({ message: "Payment link not found or inactive" });
  }

  res.json({
    linkId: link.linkId,
    businessName: link.merchantId.businessName,
    title: link.title,
    description: link.description,
    amount: link.amount,
    isReusable: link.isReusable
  });
}
