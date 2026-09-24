import mongoose from "mongoose";

const paymentLinkSchema = new mongoose.Schema(
  {
    linkId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0, min: 0 }, // 0 means customer can enter custom amount
    isReusable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    maxPayments: { type: Number, default: 0 }, // 0 = unlimited
    paymentsCount: { type: Number, default: 0 },
    totalCollected: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

paymentLinkSchema.index({ merchantId: 1, isActive: 1 });

export const PaymentLink = mongoose.model("PaymentLink", paymentLinkSchema);
