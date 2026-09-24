import mongoose from "mongoose";

const friendSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    favorite: { type: Boolean, default: false }
  },
  { timestamps: true }
);

friendSchema.index({ userId: 1, friendId: 1 }, { unique: true });

export const Friend = mongoose.model("Friend", friendSchema);
