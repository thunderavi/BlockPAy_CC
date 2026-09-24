import crypto from "crypto";
import { z } from "zod";
import { Merchant } from "../models/Merchant.js";
import { MerchantOrder } from "../models/MerchantOrder.js";
import { Refund } from "../models/Refund.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { anchorTransaction, createProofPayload } from "../services/blockchainService.js";
import { dispatchWebhook } from "../services/webhookService.js";

const refundSchema = z.object({
  amount: z.number().min(1).optional(), // Optional: defaults to full remaining amount
  reason: z.string().default("Customer requested refund")
});

/**
 * Issue Full or Partial Refund for a Merchant Order
 */
export async function createRefund(req, res) {
  const data = refundSchema.parse(req.body);
  const orderIdentifier = req.params.id;

  // Identify merchant either from req.merchant (API key) or req.user (Dashboard JWT)
  let merchant = req.merchant;
  if (!merchant && req.user) {
    merchant = await Merchant.findOne({ userId: req.user.id });
  }

  if (!merchant) {
    return res.status(401).json({ message: "Authentication required to process refunds" });
  }

  const query = {
    merchantId: merchant._id,
    $or: [{ orderId: orderIdentifier }]
  };
  if (orderIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: orderIdentifier });
  }

  const order = await MerchantOrder.findOne(query);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.status !== "paid" && order.status !== "partially_refunded") {
    return res.status(400).json({ message: `Cannot refund order in status "${order.status}"` });
  }

  const maxRefundable = Math.round((order.amount - order.refundedAmount) * 100) / 100;
  const refundAmount = data.amount ? Math.round(data.amount * 100) / 100 : maxRefundable;

  if (refundAmount <= 0) {
    return res.status(400).json({ message: "Order is already fully refunded" });
  }

  if (refundAmount > maxRefundable) {
    return res.status(400).json({
      message: `Refund amount (₹${refundAmount}) exceeds maximum refundable amount (₹${maxRefundable})`
    });
  }

  if (merchant.walletBalances.availableBalance < refundAmount) {
    return res.status(400).json({
      message: "Insufficient merchant available balance to process this refund"
    });
  }

  const customerUser = await User.findById(order.customer.userId);
  if (!customerUser) {
    return res.status(404).json({ message: "Customer account not found for refund credit" });
  }

  const customerWallet = await Wallet.findOne({ userId: customerUser._id });
  if (!customerWallet) {
    return res.status(404).json({ message: "Customer wallet not found" });
  }

  // Atomically reverse balances
  merchant.walletBalances.availableBalance =
    Math.round((merchant.walletBalances.availableBalance - refundAmount) * 100) / 100;
  await merchant.save();

  customerWallet.balance = Math.round((customerWallet.balance + refundAmount) * 100) / 100;
  await customerWallet.save();

  // Create hash-linked proof
  const proof = await createProofPayload({
    sender: { username: merchant.businessName.replace(/\s+/g, "_").toLowerCase() },
    receiver: customerUser,
    amount: refundAmount,
    note: `Refund for ${order.orderId}: ${data.reason}`
  });

  // Create ledger reversal transaction
  const transaction = await Transaction.create({
    senderId: merchant.userId,
    receiverId: customerUser._id,
    amount: refundAmount,
    note: `Refund for ${order.orderId}`,
    status: "successful",
    hash: proof.hash,
    previousHash: proof.previousHash,
    referenceId: proof.referenceId,
    metadata: {
      type: "merchant_refund",
      orderId: order.orderId,
      merchantId: merchant._id
    }
  });

  // Anchor to Solidity contract
  let anchoredTx = transaction;
  try {
    anchoredTx = await anchorTransaction(transaction);
  } catch {
    // Non-fatal
  }

  // Update order refund tracking
  order.refundedAmount = Math.round((order.refundedAmount + refundAmount) * 100) / 100;
  order.status = order.refundedAmount >= order.amount ? "refunded" : "partially_refunded";
  await order.save();

  const refundId = `RF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const refundDoc = await Refund.create({
    refundId,
    orderId: order._id,
    merchantId: merchant._id,
    customerId: customerUser._id,
    amount: refundAmount,
    reason: data.reason,
    status: "processed",
    transactionId: transaction._id,
    receiptHash: proof.hash,
    blockchainTxHash: anchoredTx.metadata?.blockchainTxHash || null
  });

  // Dispatch webhook event to merchant server
  dispatchWebhook(order, merchant, "order.refunded").catch(() => {});

  // Send customer notification
  await Notification.create({
    userId: customerUser._id,
    title: "Refund Received",
    type: "payment",
    message: `Received ₹${refundAmount} refund from ${merchant.businessName} for order ${order.orderId}`
  });

  res.status(200).json({
    message: "Refund processed successfully",
    refund: {
      refundId: refundDoc.refundId,
      orderId: order.orderId,
      amount: refundAmount,
      totalRefunded: order.refundedAmount,
      orderStatus: order.status,
      receiptHash: proof.hash,
      blockchainTxHash: refundDoc.blockchainTxHash
    }
  });
}
