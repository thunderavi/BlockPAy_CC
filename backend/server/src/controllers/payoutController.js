import crypto from "crypto";
import { z } from "zod";
import { Merchant } from "../models/Merchant.js";
import { Payout } from "../models/Payout.js";

const payoutSchema = z.object({
  amount: z.number().min(100),
  destinationType: z.enum(["bank_account", "upi"]).default("upi"),
  accountDetails: z.string().min(3)
});

/**
 * Request Merchant Bank / UPI Payout
 */
export async function requestPayout(req, res) {
  const data = payoutSchema.parse(req.body);
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  if (merchant.walletBalances.availableBalance < data.amount) {
    return res.status(400).json({
      message: `Insufficient available balance (₹${merchant.walletBalances.availableBalance}) for payout of ₹${data.amount}`
    });
  }

  // Deduct available balance and hold in pending settlement
  merchant.walletBalances.availableBalance =
    Math.round((merchant.walletBalances.availableBalance - data.amount) * 100) / 100;
  merchant.walletBalances.pendingSettlement =
    Math.round((merchant.walletBalances.pendingSettlement + data.amount) * 100) / 100;
  await merchant.save();

  const payoutId = `PO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const payout = await Payout.create({
    payoutId,
    merchantId: merchant._id,
    amount: data.amount,
    destination: {
      type: data.destinationType,
      accountDetails: data.accountDetails
    },
    status: "processing"
  });

  res.status(201).json({
    message: "Payout request submitted successfully",
    payout: {
      payoutId: payout.payoutId,
      amount: payout.amount,
      status: payout.status,
      destination: payout.destination,
      createdAt: payout.createdAt
    }
  });
}

/**
 * List Merchant Payout History
 */
export async function listPayouts(req, res) {
  const merchant = await Merchant.findOne({ userId: req.user.id });
  if (!merchant) {
    return res.status(404).json({ message: "Merchant account not found" });
  }

  const payouts = await Payout.find({ merchantId: merchant._id }).sort({ createdAt: -1 });
  res.json({ payouts });
}
