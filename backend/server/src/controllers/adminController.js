import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

export async function summary(req, res) {
  const [totalUsers, totalPayments, volumeAgg, latestTransactions] = await Promise.all([
    User.countDocuments(),
    Transaction.countDocuments({ status: "successful" }),
    Transaction.aggregate([
      { $match: { status: "successful" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Transaction.find()
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("senderId", "name username")
      .populate("receiverId", "name username")
  ]);

  const highValue = await Transaction.find({ amount: { $gte: 5000 } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("senderId", "name username")
    .populate("receiverId", "name username");

  res.json({
    totalUsers,
    totalPayments,
    totalVolume: volumeAgg[0]?.total || 0,
    latestTransactions,
    fraudAlerts: highValue
  });
}
