import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireApiKey } from "../middleware/apiKeyAuth.js";
import { idempotency } from "../middleware/idempotency.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createOrder,
  getCheckoutSession,
  getOrder,
  getPaymentLinkPublic,
  payOrder
} from "../controllers/checkoutController.js";
import { createRefund } from "../controllers/refundController.js";

const router = Router();

// Developer Gateway Orders (Auth via API Key + Idempotency)
router.post("/orders", requireApiKey, idempotency, asyncHandler(createOrder));
router.get("/orders/:id", requireApiKey, asyncHandler(getOrder));
router.post("/orders/:id/refund", requireApiKey, idempotency, asyncHandler(createRefund));

// Public Checkout Session UI (for web checkout pages and QR display)
router.get("/session/:orderId", asyncHandler(getCheckoutSession));

// Customer Payment Approval (Auth via Customer JWT)
router.post("/pay", requireAuth, idempotency, asyncHandler(payOrder));

// Public Shareable Payment Link Details
router.get("/links/:linkId", asyncHandler(getPaymentLinkPublic));

export default router;
