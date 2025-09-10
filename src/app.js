import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth.routes.js";
import profileRoutes from "./routes/profile.routes.js";

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Health Check
app.get("/", (req, res) => {
    res.json({ status: "VerifyMe API running 🚀" });
});

export default app;
