const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { setOTP, getOTP, clearOTP } = require('../utils/otpStore');
const sendOTPEmail = require('../utils/sendEmail');
// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        console.log(req.body);
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setOTP(email, otp);
        // Send OTP email
        await sendOTPEmail(email, otp);
        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
};

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, dob, mobile, userType } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            dob,
            mobile,
            userType
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                token: generateToken(user._id),
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                userType: user.userType,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const stored = getOTP(email);
        if (!stored) {
            return res.status(400).json({ message: 'No OTP found for this email' });
        }
        // OTP expires in 10 minutes
        if (Date.now() - stored.timestamp > 10 * 60 * 1000) {
            clearOTP(email);
            return res.status(400).json({ message: 'OTP expired' });
        }
        if (stored.otp === otp) {
            clearOTP(email);
            res.json({ verified: true });
        } else {
            res.status(400).json({ message: 'Invalid OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const sendPasswordResetOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with this email' });
        }
        
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setOTP(email, otp);
        
        // Send OTP email
        await sendOTPEmail(email, otp, 'Password Reset');
        
        res.json({ message: 'Password reset OTP sent to your email' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }
};

// @desc    Reset password with OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        
        // Verify OTP
        const stored = getOTP(email);
        if (!stored) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }
        
        // Check OTP expiry (10 minutes)
        if (Date.now() - stored.timestamp > 10 * 60 * 1000) {
            clearOTP(email);
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }
        
        // Validate OTP
        if (stored.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }
        
        // Find user and update password
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update password (will be auto-hashed by mongoose middleware)
        user.password = newPassword;
        await user.save();
        
        // Clear OTP after successful reset
        clearOTP(email);
        
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const { name, mobile, dob, currentPassword } = req.body;
        const userId = req.user._id;

        // Get user from database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await user.matchPassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update user fields
        if (name) user.name = name;
        if (mobile) user.mobile = mobile;
        if (dob) user.dob = dob;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                dob: user.dob,
                userType: user.userType
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    verifyOTP,
    sendOTP,
    sendPasswordResetOTP,
    resetPassword,
    updateProfile
};