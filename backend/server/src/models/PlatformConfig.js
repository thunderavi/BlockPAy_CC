import mongoose from "mongoose";

const platformConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    defaultCommissionRate: { type: Number, default: 1.5, min: 0, max: 100 },
    maxTransferLimit: { type: Number, default: 25000, min: 100 },
    dailyUserLimit: { type: Number, default: 50000, min: 500 },
    payoutApprovalThreshold: { type: Number, default: 10000, min: 1000 },
    maintenanceMode: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const PlatformConfig = mongoose.model("PlatformConfig", platformConfigSchema);

export async function getPlatformConfig() {
  let cfg = await PlatformConfig.findOne({ key: "global" });
  if (!cfg) {
    cfg = await PlatformConfig.create({ key: "global" });
  }
  return cfg;
}
