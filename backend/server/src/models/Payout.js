import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    payoutId: { type: String, required: true, unique: true, index: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    amount: { type: Number, required: true, min: 100 },
    destination: {
      type: { type: String, enum: ["bank_account", "upi"], default: "upi" },
      accountDetails: { type: String, required: true }
    },
    status: {
      type: String,
      enum: ["requested", "processing", "completed", "rejected"],
      default: "requested"
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bankReferenceNumber: { type: String, default: null },
    rejectionReason: { type: String, default: null }
  },
  { timestamps: true }
);

payoutSchema.index({ merchantId: 1, createdAt: -1 });

export const Payout = mongoose.model("Payout", payoutSchema);
