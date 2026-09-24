import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    businessType: {
      type: String,
      enum: ["retail_store", "food_dining", "online_store", "campus_service", "event_organizer", "other"],
      default: "retail_store"
    },
    registrationNumber: { type: String, default: "", trim: true },
    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending_verification", "active", "suspended", "rejected"],
      default: "active" // Default active for seamless developer/campus onboarding
    },
    settlementDetails: {
      bankAccountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" },
      upiId: { type: String, default: "" }
    },
    walletBalances: {
      availableBalance: { type: Number, default: 0, min: 0 },
      pendingSettlement: { type: Number, default: 0, min: 0 },
      totalSettled: { type: Number, default: 0, min: 0 }
    },
    commissionRate: { type: Number, default: 1.5, min: 0, max: 100 }, // Percentage fee
    webhookUrl: { type: String, default: "" },
    webhookSecret: { type: String, default: "" }
  },
  { timestamps: true }
);

merchantSchema.index({ businessName: "text", contactEmail: "text" });

export const Merchant = mongoose.model("Merchant", merchantSchema);
