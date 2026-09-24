import mongoose from "mongoose";
import { config } from "../config.js";
import { User } from "../models/User.js";
import { Wallet } from "../models/Wallet.js";
import { anchorTransaction, createProofPayload } from "../services/blockchainService.js";
import { createNotification } from "../services/notificationService.js";
import { Transaction } from "../models/Transaction.js";
import { offloadedCompare } from "../workers/cryptoPool.js";

export async function getWallet(req, res) {
  const wallet = await Wallet.findOne({ userId: req.user._id });
  res.json({ wallet });
}

export async function transferMoney(req, res) {
  const receiverUsername = String(req.body.username || "").replace("@", "").toLowerCase();
  const amount = Number(req.body.amount);
  const note = String(req.body.note || "");
  const pin = String(req.body.pin || "1234");

  if (!receiverUsername || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Receiver username and valid amount are required" });
  }

  const sender = await User.findById(req.user._id);
  if (!(await offloadedCompare(pin, sender.pinHash))) {
    return res.status(403).json({ message: "Invalid payment PIN" });
  }

  const receiver = await User.findOne({ username: receiverUsername });
  if (!receiver) {
    return res.status(404).json({ message: "Receiver not found" });
  }

  if (String(receiver._id) === String(sender._id)) {
    return res.status(400).json({ message: "You cannot transfer to yourself" });
  }

  let senderWallet;
  let transaction;
  const settle = async (session = null) => {
    const options = session ? { session } : {};
    senderWallet = await Wallet.findOne({ userId: sender._id }, null, options);
    const receiverWallet = await Wallet.findOne({ userId: receiver._id }, null, options);
    if (!senderWallet || senderWallet.balance < amount) {
      const error = new Error("Insufficient demo balance"); error.status = 400; throw error;
    }
    if (!receiverWallet) { const error = new Error("Receiver wallet not found"); error.status = 404; throw error; }
    senderWallet.balance -= amount; receiverWallet.balance += amount;
    const proof = await createProofPayload({ sender, receiver, amount, note, session });
    const created = await Transaction.create([{ senderId: sender._id, receiverId: receiver._id, amount, note, status: "successful", hash: proof.hash, previousHash: proof.previousHash, referenceId: proof.referenceId, metadata: { verifiedAt: proof.timestamp, blockchainStatus: config.blockchain.enabled ? "pending" : "not_anchored", blockchainAttempts: 0 } }], options);
    transaction = created[0];
    await senderWallet.save(options); await receiverWallet.save(options);
  };
  if (config.useMongoTransactions) {
    const session = await mongoose.startSession();
    try { await session.withTransaction(() => settle(session)); } finally { await session.endSession(); }
  } else {
    await settle();
  }

  transaction = await anchorTransaction(transaction);

  await createNotification({
    userId: receiver._id,
    title: "Payment received",
    message: `${sender.name} sent you INR ${amount}`,
    type: "payment"
  });

  await createNotification({
    userId: sender._id,
    title: "Payment sent",
    message: `Your payment to ${receiver.name} has a tamper-evident BlockPay receipt`,
    type: "payment"
  });

  const populated = await Transaction.findById(transaction._id)
    .populate("senderId", "name username avatar")
    .populate("receiverId", "name username avatar");

  res.status(201).json({ transaction: populated, wallet: senderWallet });
}

export async function depositDemo(req, res) {
  const amount = Number(req.body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valid amount is required" });
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId: req.user._id },
    { $inc: { balance: amount } },
    { new: true }
  );

  res.json({ wallet });
}

export async function withdrawDemo(req, res) {
  const amount = Number(req.body.amount || 0);
  const wallet = await Wallet.findOne({ userId: req.user._id });

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valid amount is required" });
  }

  if (wallet.balance < amount) {
    return res.status(400).json({ message: "Insufficient demo balance" });
  }

  wallet.balance -= amount;
  await wallet.save();
  res.json({ wallet });
}
