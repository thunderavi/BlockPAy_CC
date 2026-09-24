import mongoose from "mongoose";

const merchantOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    merchantReference: { type: String, default: "" },
    amount: { type: Number, required: true, min: 1 },
    feeAmount: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    description: { type: String, default: "" },
    customer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    status: {
      type: String,
      enum: ["created", "processing", "paid", "failed", "refunded", "partially_refunded", "expired"],
      default: "created"
    },
    refundedAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    paymentTxId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    receiptHash: { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    idempotencyKey: { type: String, default: null, index: true },
    webhookDelivery: {
      status: { type: String, enum: ["pending", "delivered", "failed", "not_configured"], default: "pending" },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: null }
    }
  },
  { timestamps: true }
);

merchantOrderSchema.index({ merchantId: 1, createdAt: -1 });

export const MerchantOrder = mongoose.model("MerchantOrder", merchantOrderSchema);
