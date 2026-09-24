import { Notification } from "../models/Notification.js";

export function createNotification({ userId, title, message, type = "info" }) {
  return Notification.create({ userId, title, message, type });
}
