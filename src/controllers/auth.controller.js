import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { addToBlacklist } from "../utils/tokenBlacklist.js";
import { sendEmail } from "../utils/mailer.js";
import { generateOTP, saveOTP, verifyOTP } from "../utils/otp.js";

const prisma = new PrismaClient();

// Generate JWT
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );
};

// REGISTER
export const register = async (req, res) => {
    try {
        const { email, phone, password, role } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] },
        });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email/phone already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                phone,
                passwordHash: hashedPassword,
                role,
            },
        });

        res.status(201).json({
            message: "User registered successfully",
            userId: user.id,
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// LOGIN
export const login = async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        // Find user (by email or phone)
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    email ? { email } : undefined,
                    phone ? { phone } : undefined,
                ].filter(Boolean),
            },
        });

        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // Verify password
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return res.status(400).json({ message: "Invalid credentials" });

        // Generate token
        const token = generateToken(user);

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

// LOGOUT

export const logout = async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (token) {
            addToBlacklist(token);
        }

        res.json({ message: "Logout successful" });
    } catch (error) {
        console.error("LOGOUT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};



// FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
    try {
        const { email, phone } = req.body;

        // find user
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }]
            }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        // generate and save OTP
        const code = generateOTP();
        const identifier = email || phone;
        saveOTP(identifier, code);

        // send OTP (only email for now)
        if (email) {
            await sendEmail(email, "Password Reset OTP", `Your OTP code is: ${code} will expire in 5 min`);
        } else {
            console.log(`SMS OTP for ${phone}: ${code}`); // hook with Twilio later
        }

        res.json({ message: "OTP sent successfully will expire in 5 min" });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// RESET PASSWORD
export const resetPassword = async (req, res) => {
    try {
        const { email, phone, otp, newPassword } = req.body;

        const identifier = email || phone;

        // validate OTP
        const isValid = verifyOTP(identifier, otp);
        if (!isValid) return res.status(400).json({ message: "Invalid or expired OTP" });

        // find user
        const user = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        });
        if (!user) return res.status(404).json({ message: "User not found" });

        // hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // update password
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashedPassword }
        });

        res.json({ message: "Password reset successful" });
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // from JWT middleware

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(404).json({ message: "User not found" });

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });

        res.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("CHANGE PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
