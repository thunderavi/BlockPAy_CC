import { Router } from "express";
import { addFriend, listFriends, removeFriend } from "../controllers/friendController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(listFriends));
router.post("/", requireAuth, asyncHandler(addFriend));
router.delete("/:friendId", requireAuth, asyncHandler(removeFriend));

export default router;
