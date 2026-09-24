import { Notification } from "../models/Notification.js";

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ notifications });
}

export async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json({ notification });
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ userId: req.user._id }, { read: true });
  res.json({ message: "Notifications marked as read" });
}
