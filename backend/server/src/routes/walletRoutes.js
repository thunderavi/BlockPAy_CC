import { Router } from "express";
import { depositDemo, getWallet, transferMoney, withdrawDemo } from "../controllers/walletController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(getWallet));
router.get("/balance", requireAuth, asyncHandler(getWallet));
router.post("/transfer", requireAuth, asyncHandler(transferMoney));
router.post("/deposit-demo", requireAuth, asyncHandler(depositDemo));
router.post("/withdraw-demo", requireAuth, asyncHandler(withdrawDemo));

export default router;
