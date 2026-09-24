import { Router } from "express";
import { listNotifications, markAllRead, markRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listNotifications));
router.put("/read-all", requireAuth, asyncHandler(markAllRead));
router.put("/:id/read", requireAuth, asyncHandler(markRead));

export default router;
