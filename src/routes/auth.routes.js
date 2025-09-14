import express from "express";
import {
    register,
    verifyAccount,
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    resendVerification,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/verify", verifyAccount);   // ✅ New route for OTP verification
router.post("/resend-verification", resendVerification);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.post("/logout", authMiddleware, logout);
router.post("/change-password", authMiddleware, changePassword);

export default router;
