import mongoose from "mongoose";

const merchantStaffSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    counterName: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["cashier", "manager"],
      default: "cashier"
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

merchantStaffSchema.index({ merchantId: 1, userId: 1 }, { unique: true });

export const MerchantStaff = mongoose.model("MerchantStaff", merchantStaffSchema);
