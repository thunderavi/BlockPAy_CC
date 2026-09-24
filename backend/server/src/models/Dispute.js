import mongoose from "mongoose";

const disputeSchema = new mongoose.Schema(
  {
    disputeId: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "MerchantOrder", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved_refunded", "resolved_rejected"],
      default: "open"
    },
    evidence: { type: String, default: "" },
    resolutionNotes: { type: String, default: "" },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

disputeSchema.index({ merchantId: 1, status: 1 });

export const Dispute = mongoose.model("Dispute", disputeSchema);
