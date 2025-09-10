import jwt from "jsonwebtoken";
import { isBlacklisted } from "../utils/tokenBlacklist.js";

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token format" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};
export const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "No token provided" });
    if (isBlacklisted(token)) return res.status(401).json({ message: "Token is invalid. Please login again." });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (error) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

