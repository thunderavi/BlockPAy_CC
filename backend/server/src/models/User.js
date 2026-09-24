import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    avatar: { type: String, default: "" },
    collegeId: { type: String, default: "" },
    bio: { type: String, default: "" },
    pinHash: { type: String, default: "" },
    role: { type: String, enum: ["student", "admin"], default: "student" }
  },
  { timestamps: true }
);

userSchema.index({ name: "text", username: "text", email: "text" });

export const User = mongoose.model("User", userSchema);
