import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  addStaff,
  createApiKey,
  getAnalytics,
  getProfile,
  listApiKeys,
  listStaff,
  onboardMerchant,
  removeStaff,
  revokeApiKey,
  updateProfile
} from "../controllers/merchantController.js";
import { createPaymentLink, listPaymentLinks } from "../controllers/checkoutController.js";
import { listPayouts, requestPayout } from "../controllers/payoutController.js";

const router = Router();

// Merchant Onboarding & Settings
router.post("/onboard", requireAuth, asyncHandler(onboardMerchant));
router.get("/profile", requireAuth, asyncHandler(getProfile));
router.put("/profile", requireAuth, asyncHandler(updateProfile));
router.get("/analytics", requireAuth, asyncHandler(getAnalytics));

// API Keys Management
router.post("/api-keys", requireAuth, asyncHandler(createApiKey));
router.get("/api-keys", requireAuth, asyncHandler(listApiKeys));
router.delete("/api-keys/:id", requireAuth, asyncHandler(revokeApiKey));

// Payment Links Management
router.post("/payment-links", requireAuth, asyncHandler(createPaymentLink));
router.get("/payment-links", requireAuth, asyncHandler(listPaymentLinks));

// Payouts & Settlements
router.post("/payouts", requireAuth, asyncHandler(requestPayout));
router.get("/payouts", requireAuth, asyncHandler(listPayouts));

// Staff & Counter POS Management
router.post("/staff", requireAuth, asyncHandler(addStaff));
router.get("/staff", requireAuth, asyncHandler(listStaff));
router.delete("/staff/:id", requireAuth, asyncHandler(removeStaff));

export default router;
