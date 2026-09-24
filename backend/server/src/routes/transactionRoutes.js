import { Router } from "express";
import {
  acceptRequest,
  getTransaction,
  listRequests,
  listTransactions,
  rejectRequest,
  requestPayment,
  splitBill,
  retryTransactionBlockchain,
  verifyTransactionBlockchain
} from "../controllers/transactionController.js";
import { transferMoney } from "../controllers/walletController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listTransactions));
router.get("/requests", requireAuth, asyncHandler(listRequests));
router.get("/:id/blockchain/verify", requireAuth, asyncHandler(verifyTransactionBlockchain));
router.post("/:id/blockchain/retry", requireAuth, asyncHandler(retryTransactionBlockchain));
router.get("/:id", requireAuth, asyncHandler(getTransaction));
router.post("/send", requireAuth, asyncHandler(transferMoney));
router.post("/request", requireAuth, asyncHandler(requestPayment));
router.post("/split", requireAuth, asyncHandler(splitBill));
router.post("/accept/:id", requireAuth, asyncHandler(acceptRequest));
router.post("/reject/:id", requireAuth, asyncHandler(rejectRequest));

export default router;
