import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "merchant_verified",
        "merchant_suspended",
        "merchant_reactivated",
        "payout_approved",
        "payout_rejected",
        "config_updated",
        "dispute_resolved",
        "user_role_updated"
      ]
    },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    changes: { type: Object, default: {} },
    ipAddress: { type: String, default: "127.0.0.1" }
  },
  { timestamps: true }
);

auditLogSchema.index({ adminId: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
