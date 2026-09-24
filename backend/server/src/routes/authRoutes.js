import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { forgotPassword, login, profile, register, updateProfile, changePin } from "../controllers/authController.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.get("/profile", requireAuth, asyncHandler(profile));
router.put("/profile", requireAuth, asyncHandler(updateProfile));
router.post("/change-pin", requireAuth, asyncHandler(changePin));
router.post("/logout", (_req, res) => res.json({ message: "Logged out" }));

export default router;
