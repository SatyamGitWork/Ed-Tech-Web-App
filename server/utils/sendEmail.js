const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOTPEmail(to, otp, type = 'Verification') {
    const subject = type === 'Password Reset' 
        ? 'Your Ed-Tech Password Reset OTP' 
        : 'Your Ed-Tech OTP Code';
    
    const message = type === 'Password Reset'
        ? `Your password reset OTP code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
        : `Your OTP code is: ${otp}\n\nThis code will expire in 10 minutes.`;
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text: message
    };
    return transporter.sendMail(mailOptions);
}

module.exports = sendOTPEmail;