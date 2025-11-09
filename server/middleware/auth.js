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

            // Validate token format (basic check)
            if (!token || token === 'null' || token === 'undefined') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token format' 
                });
            }

            // Verify token with algorithm specification for security
            const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ['HS256'] // Specify allowed algorithm
            });

            // Validate decoded token structure
            if (!decoded.id) {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token payload' 
                });
            }

            // Get user from token (exclude password)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ 
                    success: false,
                    message: 'User not found or account deactivated' 
                });
            }

            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            
            // Provide specific error messages
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Token expired. Please login again.' 
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    success: false,
                    message: 'Invalid token. Please login again.' 
                });
            }
            
            return res.status(401).json({ 
                success: false,
                message: 'Authentication failed' 
            });
        }
    } else {
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized, no token provided' 
        });
    }
};

// Check if user is a teacher
const teacherOnly = (req, res, next) => {
    if (req.user && req.user.userType === 'teacher') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Access denied. Teachers only.' 
        });
    }
};

// Check if user is a student
const studentOnly = (req, res, next) => {
    if (req.user && req.user.userType === 'student') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Access denied. Students only.' });
    }
};

// Check if user is admin (for sensitive operations)
const adminOnly = (req, res, next) => {
    // For now, teachers are admins. You can add a separate 'admin' userType later
    if (req.user && req.user.userType === 'teacher') {
        next();
    } else {
        res.status(403).json({ 
            success: false,
            message: 'Access denied. Administrators only.' 
        });
    }
};

// Additional security: Verify user owns the resource
const verifyOwnership = (Model, paramName = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            const resource = await Model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            // Check if user field exists and matches
            if (resource.user && resource.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You do not own this resource.'
                });
            }

            // Attach resource to request for later use
            req.resource = resource;
            next();
        } catch (error) {
            console.error('Ownership verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Error verifying ownership'
            });
        }
    };
};

module.exports = { protect, teacherOnly, studentOnly, adminOnly, verifyOwnership };
