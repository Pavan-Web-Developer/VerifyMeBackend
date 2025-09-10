import express from "express";
import { upsertProfile, getProfile } from "../controllers/profile.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { logout } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/", authenticate, upsertProfile);   // Create or Update Profile
router.get("/", authenticate, getProfile);       // Get logged-in user's profile
router.post("/logout", authenticate, logout);  // Logout
export default router;
