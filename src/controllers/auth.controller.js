// controllers/authController.js

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";
import { sendEmail } from "../utils/mailer.js";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import { validatePassword } from "../utils/passwordUtils.js";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

const prisma = new PrismaClient();
// =================== REGISTER ===================
export const register = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ message: "Email or phone is required" });
        }

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        if (!validatePassword(password)) {
            return res.status(400).json({
                message: "Password must be 8+ characters, include uppercase, number, and special symbol",
            });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                phone,
                passwordHash: hashedPassword,
                isVerified: false,
            },
        });

        if (email) {
            // ✅ Generate email verification link
            const token = jwt.sign(
                { userId: user.id },
                JWT_SECRET,
                { expiresIn: "24h" }
            );

            const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;

            await sendEmail(
                email,
                "Verify Your Account",
                `Welcome to VerifyMe!<br><br>
                Please verify your account by clicking the link below:<br>
                <a href="${verifyUrl}">Verify Account</a><br><br>
                This link is valid for 24 hours.`
            );
        } else {
            // ✅ Phone OTP
            const code = generateOTP();
            const identifier = phone;
            saveOTP(identifier, code);

            console.log(`SMS OTP for ${phone}: ${code}`);
        }
        // Optionally, store initial password in history table
        await prisma.passwordHistory.create({
            data: { userId: user.id, passwordHash: hashedPassword },
        });
        res.status(201).json({
            message: "User registered successfully. Please verify your account Through verification link.",
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};


// =================== LOGIN ===================
export const login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your account first" });
        }
        if (user.lockUntil && new Date() < user.lockUntil) {
            return res.status(403).json({ message: "Account temporarily locked. Try later." });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginAttempts: user.failedLoginAttempts + 1,
                    lockUntil: user.failedLoginAttempts + 1 >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null
                }
            });
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Reset failed attempts on successful login
        await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockUntil: null }
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =================== VERIFY ACCOUNT ===================
// =================== VERIFY ACCOUNT ===================
export const verifyAccount = async (req, res) => {
    try {
        const { email, phone, otp, token } = req.body;

        let user;

        if (token) {
            // ✅ Email verification link
            const decoded = jwt.verify(token, JWT_SECRET);
            user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        } else if (phone && otp) {
            // ✅ Phone OTP verification
            const isValid = verifyOTP(phone, otp);
            if (!isValid) return res.status(400).json({ message: "Invalid or expired OTP" });

            user = await prisma.user.findFirst({ where: { phone } });
        }

        if (!user) return res.status(404).json({ message: "User not found" });

        await prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });

        res.json({ message: "Account verified successfully" });
    } catch (error) {
        console.error("VERIFY ACCOUNT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};



// =================== FORGOT PASSWORD ===================
export const forgotPassword = async (req, res) => {
    try {
        const { email, phone } = req.body;
        const identifier = email || phone;

        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const code = generateOTP();
        saveOTP(identifier, code);

        if (email) {
            await sendEmail(email, "Password Reset OTP", `Your OTP is ${code}`);
        } else {
            console.log(`SMS OTP for ${phone}: ${code}`);
        }

        res.json({ message: "OTP sent for password reset" });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =================== RESET PASSWORD ===================
export const resetPassword = async (req, res) => {
    try {
        const { email, phone, otp, newPassword } = req.body;
        const identifier = email || phone;

        const isValid = verifyOTP(identifier, otp);
        if (!isValid) return res.status(400).json({ message: "Invalid or expired OTP" });

        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message: "Password must be 8+ characters, include uppercase, number, and special symbol",
            });
        }

        // Check last 3 passwords
        const history = await prisma.passwordHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 3,
        });
        for (let record of history) {
            const match = await bcrypt.compare(newPassword, record.passwordHash);
            if (match) {
                return res.status(400).json({ message: "Cannot reuse last 3 passwords" });
            }
        }

        // Save new password in history
        await prisma.passwordHistory.create({
            data: { userId: user.id, passwordHash: hashedPassword },
        });

        // await prisma.user.update({
        //     where: { id: user.id },
        //     data: { passwordHash: hashedPassword },
        // });

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =================== CHANGE PASSWORD ===================
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isMatch) return res.status(400).json({ message: "Invalid old password" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword },
        });

        if (!validatePassword(newPassword)) {
            return res.status(400).json({
                message: "Password must be 8+ characters, include uppercase, number, and special symbol",
            });
        }

        // Check last 3 passwords
        const history = await prisma.passwordHistory.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 3,
        });
        for (let record of history) {
            const match = await bcrypt.compare(newPassword, record.passwordHash);
            if (match) {
                return res.status(400).json({ message: "Cannot reuse last 3 passwords" });
            }
        }

        // Save new password in history
        await prisma.passwordHistory.create({
            data: { userId: user.id, passwordHash: hashedPassword },
        });


        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// =================== LOGOUT ===================
export const logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(400).json({ message: "Token not provided" });

        addToBlacklist(token);
        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("LOGOUT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
// =================== RESEND VERIFICATION ===================
export const resendVerification = async (req, res) => {
    try {
        const { email, phone } = req.body;

        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });

        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isVerified) return res.status(400).json({ message: "User already verified" });

        if (email) {
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
            const verifyUrl = `${process.env.FRONTEND_URL}/verify?token=${token}`;

            await sendEmail(
                email,

                "Resend Verification - Verify Your Account",
                `Here’s your new verification link:<br>
                <a href="${verifyUrl}">Verify Account</a><br><br>
                This link will expire in 24 hours.`
            );
        } else if (phone) {
            const code = generateOTP();
            saveOTP(phone, code);
            console.log(`Resent SMS OTP for ${phone}: ${code}`);
        }

        res.json({ message: "Verification instructions resent successfully" });
    } catch (error) {
        console.error("RESEND VERIFICATION ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
