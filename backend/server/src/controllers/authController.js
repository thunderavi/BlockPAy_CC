import bcrypt from "bcryptjs";
import { z } from "zod";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { signToken } from "../utils/tokens.js";
import { offloadedHash, offloadedCompare } from "../workers/cryptoPool.js";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7),
  password: z.string().min(6),
  username: z.string().min(3).regex(/^[a-zA-Z0-9_]+$/),
  collegeId: z.string().optional(),
  bio: z.string().optional(),
  avatar: z.string().optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const username = data.username.toLowerCase();
  const email = data.email.toLowerCase();

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return res.status(409).json({ message: "Email or username is already registered" });
  }

  const passwordHash = await offloadedHash(data.password, 12);
  const pinHash = await offloadedHash(data.pin || "1234", 10);
  const user = await User.create({
    name: data.name,
    email,
    phone: data.phone,
    username,
    collegeId: data.collegeId || "",
    bio: data.bio || "",
    avatar: data.avatar || "",
    passwordHash,
    pinHash
  });

  await Wallet.create({
    userId: user._id,
    balance: config.demoOpeningBalance,
    walletNumber: `BP${String(Date.now()).slice(-8)}${Math.floor(Math.random() * 90 + 10)}`
  });

  const token = signToken(user);
  const safeUser = await User.findById(user._id).select("-passwordHash -pinHash");

  res.status(201).json({ token, user: safeUser });
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const user = await User.findOne({ email: data.email.toLowerCase() });

  if (!user || !(await offloadedCompare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user);
  const safeUser = await User.findById(user._id).select("-passwordHash -pinHash");
  res.json({ token, user: safeUser });
}

export async function profile(req, res) {
  res.json({ user: req.user });
}

export async function updateProfile(req, res) {
  const allowed = ["name", "phone", "avatar", "collegeId", "bio"];
  for (const key of allowed) {
    if (typeof req.body[key] === "string") {
      req.user[key] = req.body[key];
    }
  }

  await req.user.save();
  const safeUser = await User.findById(req.user._id).select("-passwordHash -pinHash");
  res.json({ user: safeUser });
}

export async function forgotPassword(req, res) {
  const email = String(req.body.email || "").toLowerCase();
  const user = await User.findOne({ email });

  if (!user) {
    return res.json({ message: "If the email exists, a reset OTP was generated." });
  }

  res.json({
    message: "Demo reset OTP generated.",
    otp: "246810"
  });
}

const changePinSchema = z.object({
  currentPin: z.string().length(4).regex(/^\d{4}$/),
  newPin: z.string().length(4).regex(/^\d{4}$/)
});

export async function changePin(req, res) {
  const { currentPin, newPin } = changePinSchema.parse(req.body);
  const user = await User.findById(req.user._id || req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // If user already has a pinHash, verify currentPin
  if (user.pinHash) {
    const isMatch = await offloadedCompare(currentPin, user.pinHash);
    if (!isMatch) {
      return res.status(403).json({ message: "Current payment PIN is incorrect" });
    }
  }

  user.pinHash = await offloadedHash(newPin, 10);
  await user.save();

  res.json({ message: "Payment PIN changed successfully" });
}
