import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { addToBlacklist } from "../utils/tokenBlacklist.js";

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

