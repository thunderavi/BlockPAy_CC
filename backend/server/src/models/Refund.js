import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
  {
    refundId: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "MerchantOrder", required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, default: "Customer requested refund" },
    status: { type: String, enum: ["processed", "failed"], default: "processed" },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
    receiptHash: { type: String, default: null },
    blockchainTxHash: { type: String, default: null }
  },
  { timestamps: true }
);

refundSchema.index({ merchantId: 1, createdAt: -1 });

export const Refund = mongoose.model("Refund", refundSchema);
