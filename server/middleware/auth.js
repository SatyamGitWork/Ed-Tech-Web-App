const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user to request
const protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token (exclude password)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Check if user is a teacher
const teacherOnly = (req, res, next) => {
    if (req.user && req.user.userType === 'teacher') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Teachers only.' });
    }
};

// Check if user is a student
const studentOnly = (req, res, next) => {
    if (req.user && req.user.userType === 'student') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Students only.' });
    }
};

module.exports = { protect, teacherOnly, studentOnly };
