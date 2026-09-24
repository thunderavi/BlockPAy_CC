import { Router } from "express";
import { summary } from "../controllers/adminController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/summary", requireAuth, requireAdmin, asyncHandler(summary));

export default router;
