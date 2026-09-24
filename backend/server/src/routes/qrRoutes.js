import { Router } from "express";
import { generateQr, scanQr } from "../controllers/qrController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post("/generate", requireAuth, asyncHandler(generateQr));
router.post("/scan", requireAuth, asyncHandler(scanQr));

export default router;
