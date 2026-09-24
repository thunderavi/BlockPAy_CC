import { Friend } from "../models/Friend.js";
import { User } from "../models/User.js";

export async function listFriends(req, res) {
  const friends = await Friend.find({ userId: req.user._id })
    .sort({ favorite: -1, updatedAt: -1 })
    .populate("friendId", "name username avatar collegeId");

  res.json({ friends });
}

export async function addFriend(req, res) {
  const username = String(req.body.username || "").replace("@", "").toLowerCase();
  const friend = await User.findOne({ username });

  if (!friend) {
    return res.status(404).json({ message: "User not found" });
  }

  if (String(friend._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You cannot add yourself" });
  }

  const relationship = await Friend.findOneAndUpdate(
    { userId: req.user._id, friendId: friend._id },
    { favorite: Boolean(req.body.favorite) },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate("friendId", "name username avatar collegeId");

  res.status(201).json({ friend: relationship });
}

export async function removeFriend(req, res) {
  await Friend.deleteOne({ userId: req.user._id, friendId: req.params.friendId });
  res.status(204).end();
}
