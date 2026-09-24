import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    status: { type: String, enum: ["successful", "pending", "failed"], default: "successful" },
    hash: { type: String, required: true },
    previousHash: { type: String, default: "GENESIS" },
    referenceId: { type: String, required: true, unique: true },
    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

transactionSchema.index({ senderId: 1, createdAt: -1 });
transactionSchema.index({ receiverId: 1, createdAt: -1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
