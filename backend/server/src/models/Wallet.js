import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, required: true, default: 10000, min: 0 },
    walletNumber: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export const Wallet = mongoose.model("Wallet", walletSchema);
