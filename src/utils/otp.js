const otpStore = new Map(); // { email/phone: { code, expiresAt } }

export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
};

export const saveOTP = (identifier, otp) => {
    otpStore.set(identifier, {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
    });
};

export const verifyOTP = (identifier, otp) => {
    const record = otpStore.get(identifier);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
        otpStore.delete(identifier);
        return false;
    }
    if (record.code !== otp) return false;

    otpStore.delete(identifier); // remove after success
    return true;
};
