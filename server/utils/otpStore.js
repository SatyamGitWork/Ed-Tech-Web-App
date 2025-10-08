// Simple in-memory OTP store (for demo; use Redis for production)
const otpMap = new Map();

function setOTP(email, otp) {
    otpMap.set(email, { otp, timestamp: Date.now() });
}

function getOTP(email) {
    return otpMap.get(email);
}

function clearOTP(email) {
    otpMap.delete(email);
}

module.exports = { setOTP, getOTP, clearOTP };