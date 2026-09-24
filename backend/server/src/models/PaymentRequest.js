import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    payerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    splitGroupId: { type: String, default: "" }
  },
  { timestamps: true }
);

export const PaymentRequest = mongoose.model("PaymentRequest", paymentRequestSchema);
