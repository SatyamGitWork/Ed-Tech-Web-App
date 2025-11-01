require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authController = require('./controllers/authController');
const geminiController = require('./controllers/geminiController');
const courseController = require('./controllers/courseController');
const uploadController = require('./controllers/uploadController');
const oauthController = require('./controllers/oauthController');
const notificationController = require('./controllers/notificationController');
const contactController = require('./controllers/contactController');
const paymentController = require('./controllers/paymentController');
const { uploadVideo, uploadDocument, uploadImage } = require('./config/googleDrive');
const { protect, teacherOnly, studentOnly, adminOnly } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Allow multiple origins (localhost and production)
const allowedOrigins = [
    'http://localhost:5000',
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'https://ed-tech-web-app-79a4.onrender.com'
];

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io accessible to routes
app.set('io', io);

// Security: Disable x-powered-by header
app.disable('x-powered-by');

// Connect to MongoDB
connectDB();

// Middleware - Apply in correct order

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static('../client'));

// Request logging middleware (for development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    });
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Auth Routes
app.post('/api/auth/register', authController.registerUser);
app.post('/api/auth/login', authController.loginUser);
app.post('/api/auth/verify-otp', authController.verifyOTP);
app.post('/api/auth/send-otp', authController.sendOTP);
app.post('/api/auth/forgot-password', authController.sendPasswordResetOTP);
app.post('/api/auth/reset-password', authController.resetPassword);
app.put('/api/auth/update-profile', protect, authController.updateProfile);
app.get('/api/auth/profile', protect, authController.getProfile);

// Google OAuth Routes (for Drive authorization)
app.get('/auth/google', oauthController.getAuthUrl);
app.get('/auth/google/callback', oauthController.handleCallback);
app.get('/auth/google/test', oauthController.testConnection);

// Gemini AI Routes
app.post('/api/chat/gemini', geminiController.askGemini);

// Course Routes
// Public routes
app.get('/api/courses', courseController.getCourses);
app.get('/api/courses/:id', courseController.getCourseById);

// Protected teacher routes
app.post('/api/courses', protect, teacherOnly, courseController.createCourse);
app.put('/api/courses/:id', protect, teacherOnly, courseController.updateCourse);
app.delete('/api/courses/:id', protect, teacherOnly, courseController.deleteCourse);
app.get('/api/courses/my/created', protect, teacherOnly, courseController.getMyCreatedCourses);
app.post('/api/courses/:id/content', protect, teacherOnly, courseController.addCourseContent);
app.put('/api/courses/:id/content/:contentId', protect, teacherOnly, courseController.updateCourseContent);
app.delete('/api/courses/:id/content/:contentId', protect, teacherOnly, courseController.deleteContentFromCourse);
app.get('/api/courses/:id/stats', protect, teacherOnly, courseController.getCourseStats);

// Live Class routes (Teacher only)
app.post('/api/courses/:id/live-class', protect, teacherOnly, courseController.scheduleLiveClass);
app.put('/api/courses/:id/live-class/:liveClassId', protect, teacherOnly, courseController.updateLiveClass);
app.delete('/api/courses/:id/live-class/:liveClassId', protect, teacherOnly, courseController.deleteLiveClass);
app.post('/api/courses/:id/live-class/:liveClassId/start', protect, teacherOnly, courseController.startLiveStream);
app.post('/api/courses/:id/live-class/:liveClassId/stop', protect, teacherOnly, courseController.stopLiveStream);
app.post('/api/courses/:id/live-class/:liveClassId/recording', protect, teacherOnly, courseController.addRecordingUrl);
app.post('/api/courses/:id/live-class/:liveClassId/upload-recording', protect, teacherOnly, uploadVideo.single('video'), courseController.uploadRecording);
app.patch('/api/courses/:id/live-class/:liveClassId/recording-status', protect, teacherOnly, courseController.updateRecordingStatus);

// Live Stream routes (Public/Protected)
app.get('/api/courses/:id/live-class/:liveClassId', courseController.getLiveClassDetails);
app.get('/api/live-stream/:streamKey', protect, courseController.getLiveStreamByKey);

// Protected student routes
app.post('/api/courses/:id/enroll', protect, studentOnly, courseController.enrollInCourse);
app.get('/api/courses/my/enrolled', protect, studentOnly, courseController.getMyEnrolledCourses);

// File Upload Routes to Google Drive (Teacher only)
app.post('/api/upload/video', protect, teacherOnly, uploadVideo.single('file'), uploadController.uploadVideoFile);
app.post('/api/upload/document', protect, teacherOnly, uploadDocument.single('file'), uploadController.uploadDocumentFile);
app.post('/api/upload/image', protect, teacherOnly, uploadImage.single('file'), uploadController.uploadImageFile);
app.delete('/api/upload/:fileId', protect, teacherOnly, uploadController.deleteUploadedFile);

// Notification Routes (Protected - all authenticated users)
app.get('/api/notifications', protect, notificationController.getNotifications);
app.put('/api/notifications/:id/read', protect, notificationController.markAsRead);
app.put('/api/notifications/read-all', protect, notificationController.markAllAsRead);
app.delete('/api/notifications/:id', protect, notificationController.deleteNotification);
app.get('/api/notifications/unread-count', protect, notificationController.getUnreadCount);

// Contact Form Routes
app.post('/api/contact', contactController.createContact);
app.get('/api/contact', protect, teacherOnly, contactController.getAllContacts);
app.put('/api/contact/:id', protect, teacherOnly, contactController.updateContactStatus);
app.delete('/api/contact/:id', protect, teacherOnly, contactController.deleteContact);
app.get('/api/notifications/preferences', protect, notificationController.getPreferences);
app.put('/api/notifications/preferences', protect, notificationController.updatePreferences);

// Payment Routes
app.post('/api/payments/create-order', protect, studentOnly, paymentController.createOrder);
app.post('/api/payments/verify', protect, studentOnly, paymentController.verifyPayment);
app.post('/api/payments/payment-failed', protect, paymentController.paymentFailed);
app.post('/api/payments/check-status', protect, paymentController.checkPaymentStatus);
app.post('/api/payments/cancel-pending', protect, paymentController.cancelPendingPayment);
app.get('/api/payments/my-payments', protect, paymentController.getMyPayments);
app.get('/api/payments/order/:orderId', protect, paymentController.getPaymentByOrderId);
app.get('/api/payments/all', protect, teacherOnly, paymentController.getAllPayments);

// Admin-only payment security routes
app.get('/api/payments/verify-integrity/:orderId', protect, adminOnly, paymentController.verifyPaymentIntegrity);
app.get('/api/payments/admin/:orderId', protect, adminOnly, paymentController.getPaymentDetailAdmin);
app.put('/api/payments/:id/status', protect, adminOnly, paymentController.updatePaymentStatus); // Blocked endpoint

// Test endpoint to check Google Drive connection
app.get('/api/test/drive', async (req, res) => {
    try {
        const { drive } = require('./config/googleDrive');
        const response = await drive.about.get({ fields: 'user' });
        res.json({
            success: true,
            message: 'Google Drive connected successfully',
            serviceAccount: response.data.user.emailAddress
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Google Drive connection failed',
            error: error.message
        });
    }
});

// Socket.IO for real-time streaming and chat
const activeStreams = new Map(); // streamKey -> { teacherId, courseId, liveClassId, viewers: Set }

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Teacher starts streaming
    socket.on('start-stream', async ({ streamKey, userId, courseId, liveClassId, userName }) => {
        console.log(`Teacher ${userName} (${userId}) starting stream: ${streamKey}`);
        
        activeStreams.set(streamKey, {
            teacherId: userId,
            courseId,
            liveClassId,
            viewers: new Set(),
            teacherSocketId: socket.id
        });
        
        socket.join(`stream-${streamKey}`);
        socket.streamKey = streamKey;
        socket.userId = userId;
        socket.userName = userName || 'Teacher';
        socket.userRole = 'teacher';
        
        // Notify all enrolled students that stream is live
        io.to(`course-${courseId}`).emit('stream-started', {
            streamKey,
            liveClassId,
            courseId
        });
    });
    
    // Student joins stream
    socket.on('join-stream', async ({ streamKey, userId, userName }) => {
        const stream = activeStreams.get(streamKey);
        
        if (!stream) {
            socket.emit('error', { message: 'Stream not found' });
            return;
        }
        
        console.log(`Student ${userName} (${userId}) joined stream: ${streamKey}`);
        
        stream.viewers.add(userId);
        socket.join(`stream-${streamKey}`);
        socket.streamKey = streamKey;
        socket.userId = userId;
        socket.userName = userName;
        socket.userRole = 'student';
        
        // Update viewer count
        const viewerCount = stream.viewers.size;
        io.to(`stream-${streamKey}`).emit('viewer-count-updated', { count: viewerCount });
        
        // Notify teacher with student's socket ID for WebRTC
        io.to(stream.teacherSocketId).emit('new-viewer', { 
            userName, 
            viewerCount,
            studentSocketId: socket.id 
        });
    });
    
    // WebRTC signaling for peer connection
    socket.on('offer', ({ streamKey, offer, targetSocketId }) => {
        const stream = activeStreams.get(streamKey);
        if (stream && socket.userRole === 'teacher') {
            if (targetSocketId) {
                // Teacher sends offer to specific student
                console.log(`Sending offer to student: ${targetSocketId}`);
                io.to(targetSocketId).emit('offer', { 
                    offer,
                    teacherSocketId: socket.id 
                });
            } else {
                // Broadcast to all students (fallback)
                socket.to(`stream-${streamKey}`).emit('offer', { 
                    offer,
                    teacherSocketId: socket.id 
                });
            }
        }
    });
    
    socket.on('answer', ({ streamKey, answer, targetSocketId }) => {
        // Student sends answer back to teacher
        if (targetSocketId) {
            console.log(`Sending answer to teacher: ${targetSocketId}`);
            io.to(targetSocketId).emit('answer', { 
                answer, 
                studentSocketId: socket.id 
            });
        }
    });
    
    socket.on('ice-candidate', ({ streamKey, candidate, targetSocketId }) => {
        if (targetSocketId) {
            io.to(targetSocketId).emit('ice-candidate', { candidate, fromSocketId: socket.id });
        } else {
            // Broadcast to all in stream
            socket.to(`stream-${streamKey}`).emit('ice-candidate', { candidate });
        }
    });
    
    // Chat messages
    socket.on('chat-message', async ({ streamKey, message }) => {
        const stream = activeStreams.get(streamKey);
        if (!stream) {
            console.log('Stream not found for chat message');
            return;
        }
        
        // Use socket properties or fallback to payload
        const chatMessage = {
            userId: socket.userId,
            userName: socket.userName || 'Anonymous',
            message,
            timestamp: new Date()
        };
        
        console.log(`💬 Chat message from ${chatMessage.userName}: ${message}`);
        
        // Broadcast to ALL in stream (including sender)
        io.to(`stream-${streamKey}`).emit('chat-message', chatMessage);
        
        // Save to database
        try {
            const Course = require('./models/Course');
            const course = await Course.findById(stream.courseId);
            const liveClass = course.liveClasses.id(stream.liveClassId);
            
            if (liveClass) {
                liveClass.chatMessages.push({
                    user: socket.userId,
                    userName: socket.userName,
                    message,
                    timestamp: new Date()
                });
                await course.save();
            }
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    });
    
    // Student leaves stream
    socket.on('leave-stream', () => {
        if (socket.streamKey && socket.userRole === 'student') {
            const stream = activeStreams.get(socket.streamKey);
            if (stream) {
                stream.viewers.delete(socket.userId);
                const viewerCount = stream.viewers.size;
                io.to(`stream-${socket.streamKey}`).emit('viewer-count-updated', { count: viewerCount });
                
                // Notify teacher to close peer connection
                io.to(stream.teacherSocketId).emit('student-left', { 
                    studentSocketId: socket.id 
                });
            }
        }
    });
    
    // Teacher stops streaming
    socket.on('stop-stream', ({ streamKey }) => {
        console.log(`Stream stopped: ${streamKey}`);
        
        // Notify all viewers
        io.to(`stream-${streamKey}`).emit('stream-ended');
        
        // Clean up
        activeStreams.delete(streamKey);
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.streamKey) {
            const stream = activeStreams.get(socket.streamKey);
            
            if (stream) {
                if (socket.userRole === 'teacher') {
                    // Teacher disconnected, end stream
                    io.to(`stream-${socket.streamKey}`).emit('stream-ended');
                    activeStreams.delete(socket.streamKey);
                } else if (socket.userRole === 'student') {
                    // Student disconnected
                    stream.viewers.delete(socket.userId);
                    const viewerCount = stream.viewers.size;
                    io.to(`stream-${socket.streamKey}`).emit('viewer-count-updated', { count: viewerCount });
                }
            }
        }
    });
});

// 404 handler - must be after all routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err.stack);
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors
        });
    }
    
    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }
    
    // Duplicate key error (MongoDB)
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            message: `${field} already exists`
        });
    }
    
    // Default error
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ MongoDB connected`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});