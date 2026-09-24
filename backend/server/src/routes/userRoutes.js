import { Router } from "express";
import { searchUsers } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/search", requireAuth, asyncHandler(searchUsers));

export default router;
