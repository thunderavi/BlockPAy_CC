import { v7 as uuidv7 } from "uuid";
import { PaymentRequest } from "../models/PaymentRequest.js";
import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";
import { createNotification } from "../services/notificationService.js";
import { anchorTransaction, verifyOnChain } from "../services/blockchainService.js";
import { transferMoney } from "./walletController.js";

export async function listTransactions(req, res) {
  const { filter = "all", status } = req.query;
  const now = new Date();
  const query = {
    $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
  };

  if (status) {
    query.status = status;
  }

  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    query.createdAt = { $gte: start };
  }

  if (filter === "week") {
    query.createdAt = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
  }

  if (filter === "month") {
    query.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
  }

  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .populate("senderId", "name username avatar")
    .populate("receiverId", "name username avatar");

  res.json({ transactions });
}

export async function getTransaction(req, res) {
  const transaction = await Transaction.findById(req.params.id)
    .populate("senderId", "name username avatar")
    .populate("receiverId", "name username avatar");

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  const isParticipant =
    String(transaction.senderId._id) === String(req.user._id) ||
    String(transaction.receiverId._id) === String(req.user._id);

  if (!isParticipant && req.user.role !== "admin") {
    return res.status(403).json({ message: "You cannot view this transaction" });
  }

  res.json({ transaction });
}

async function participantTransaction(req,res){const transaction=await Transaction.findById(req.params.id);if(!transaction){res.status(404).json({message:"Transaction not found"});return null}const allowed=String(transaction.senderId)===String(req.user._id)||String(transaction.receiverId)===String(req.user._id)||req.user.role==="admin";if(!allowed){res.status(403).json({message:"You cannot access this transaction"});return null}return transaction}

export async function verifyTransactionBlockchain(req,res){const transaction=await participantTransaction(req,res);if(!transaction)return;res.json({blockchain:await verifyOnChain(transaction)})}

export async function retryTransactionBlockchain(req,res){const transaction=await participantTransaction(req,res);if(!transaction)return;if(transaction.metadata?.blockchainStatus==="confirmed")return res.json({transaction,message:"Receipt is already anchored"});const anchored=await anchorTransaction(transaction);const populated=await Transaction.findById(anchored._id).populate("senderId","name username avatar").populate("receiverId","name username avatar");res.json({transaction:populated})}

export async function requestPayment(req, res) {
  const payerUsername = String(req.body.username || "").replace("@", "").toLowerCase();
  const amount = Number(req.body.amount);
  const note = String(req.body.note || "");

  if (!payerUsername || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: "Payer username and valid amount are required" });
  }

  const payer = await User.findOne({ username: payerUsername });
  if (!payer) {
    return res.status(404).json({ message: "Payer not found" });
  }

  const paymentRequest = await PaymentRequest.create({
    requesterId: req.user._id,
    payerId: payer._id,
    amount,
    note
  });

  await createNotification({
    userId: payer._id,
    title: "Payment request",
    message: `${req.user.name} requested INR ${amount}${note ? ` for ${note}` : ""}`,
    type: "request"
  });

  const populated = await PaymentRequest.findById(paymentRequest._id)
    .populate("requesterId", "name username avatar")
    .populate("payerId", "name username avatar");

  res.status(201).json({ request: populated });
}

export async function listRequests(req, res) {
  const requests = await PaymentRequest.find({
    $or: [{ requesterId: req.user._id }, { payerId: req.user._id }]
  })
    .sort({ createdAt: -1 })
    .populate("requesterId", "name username avatar")
    .populate("payerId", "name username avatar");

  res.json({ requests });
}

export async function acceptRequest(req, res, next) {
  const paymentRequest = await PaymentRequest.findById(req.params.id).populate("requesterId");

  if (!paymentRequest) {
    return res.status(404).json({ message: "Payment request not found" });
  }

  if (String(paymentRequest.payerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the payer can accept this request" });
  }

  if (paymentRequest.status !== "pending") {
    return res.status(400).json({ message: "Request is already closed" });
  }

  req.body = {
    username: paymentRequest.requesterId.username,
    amount: paymentRequest.amount,
    note: paymentRequest.note,
    pin: req.body.pin || "1234"
  };

  const originalJson = res.json.bind(res);
  res.json = async (payload) => {
    paymentRequest.status = "accepted";
    await paymentRequest.save();
    originalJson({ ...payload, request: paymentRequest });
  };

  return transferMoney(req, res, next);
}

export async function rejectRequest(req, res) {
  const paymentRequest = await PaymentRequest.findById(req.params.id);

  if (!paymentRequest) {
    return res.status(404).json({ message: "Payment request not found" });
  }

  if (String(paymentRequest.payerId) !== String(req.user._id)) {
    return res.status(403).json({ message: "Only the payer can reject this request" });
  }

  paymentRequest.status = "rejected";
  await paymentRequest.save();

  await createNotification({
    userId: paymentRequest.requesterId,
    title: "Payment request rejected",
    message: `${req.user.name} rejected your request`,
    type: "request"
  });

  res.json({ request: paymentRequest });
}

export async function splitBill(req, res) {
  const title = String(req.body.title || "Split bill");
  const amount = Number(req.body.amount);
  const members = Array.isArray(req.body.members) ? req.body.members : [];

  if (!Number.isFinite(amount) || amount <= 0 || members.length === 0) {
    return res.status(400).json({ message: "Amount and at least one member are required" });
  }

  const usernames = members.map((item) => String(item).replace("@", "").toLowerCase());
  const users = await User.find({ username: { $in: usernames } });
  const perHead = Math.ceil((amount / (users.length + 1)) * 100) / 100;
  const splitGroupId = uuidv7();

  const requests = await Promise.all(
    users
      .filter((user) => String(user._id) !== String(req.user._id))
      .map(async (payer) => {
        const paymentRequest = await PaymentRequest.create({
          requesterId: req.user._id,
          payerId: payer._id,
          amount: perHead,
          note: title,
          splitGroupId
        });

        await createNotification({
          userId: payer._id,
          title: "Split bill",
          message: `${req.user.name} added you to ${title} for INR ${perHead}`,
          type: "split"
        });

        return paymentRequest.populate("payerId", "name username avatar");
      })
  );

  res.status(201).json({ perHead, requests });
}
