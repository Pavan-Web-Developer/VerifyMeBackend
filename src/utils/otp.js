// src/utils/otp.js
const otpStore = new Map(); // { identifier: { code, expiresAt } }

// Generate 6-digit OTP
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Save OTP temporarily
export const saveOTP = (identifier, otp) => {
    otpStore.set(identifier, {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    });
};

// Verify OTP
export const verifyOTP = (identifier, otp) => {
    const record = otpStore.get(identifier);
    if (!record) return false;

    if (Date.now() > record.expiresAt) {
        otpStore.delete(identifier);
        return false; // expired
    }
    if (record.code !== otp) return false;

    otpStore.delete(identifier); // consume OTP
    return true;
};
