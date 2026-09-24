import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: "Merchant", required: true },
    name: { type: String, required: true, trim: true, default: "Default API Key" },
    publishableKey: { type: String, required: true, unique: true, index: true },
    secretKeyHash: { type: String, required: true },
    secretKeyPrefix: { type: String, required: true },
    permissions: {
      type: [String],
      default: ["orders:create", "orders:read", "refunds:write"]
    },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

apiKeySchema.index({ merchantId: 1, isActive: 1 });

export const ApiKey = mongoose.model("ApiKey", apiKeySchema);
