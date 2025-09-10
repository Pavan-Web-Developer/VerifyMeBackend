// In-memory blacklist (for demo; use Redis in production)
const tokenBlacklist = new Set();

export const addToBlacklist = (token) => {
    tokenBlacklist.add(token);
};

export const isBlacklisted = (token) => tokenBlacklist.has(token);
