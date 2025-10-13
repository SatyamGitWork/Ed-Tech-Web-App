require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authController = require('./controllers/authController');
const geminiController = require('./controllers/geminiController');

const app = express();
app.use(cors({
    "origin":"*"
}))

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth Routes
app.post('/api/auth/register', authController.registerUser);
app.post('/api/auth/login', authController.loginUser);
app.post('/api/auth/verify-otp', authController.verifyOTP);
app.post('/api/auth/send-otp', authController.sendOTP);
app.post('/api/auth/forgot-password', authController.sendPasswordResetOTP);
app.post('/api/auth/reset-password', authController.resetPassword);
app.post('/api/chat/gemini', geminiController.askGemini);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));