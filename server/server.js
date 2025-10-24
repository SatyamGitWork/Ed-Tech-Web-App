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
const { uploadVideo, uploadDocument, uploadImage } = require('./config/googleDrive');
const { protect, teacherOnly, studentOnly } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Make io accessible to routes
app.set('io', io);

app.use(cors({
    "origin":"*"
}))

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// Auth Routes
app.post('/api/auth/register', authController.registerUser);
app.post('/api/auth/login', authController.loginUser);
app.post('/api/auth/verify-otp', authController.verifyOTP);
app.post('/api/auth/send-otp', authController.sendOTP);
app.post('/api/auth/forgot-password', authController.sendPasswordResetOTP);
app.post('/api/auth/reset-password', authController.resetPassword);
app.put('/api/auth/update-profile', protect, authController.updateProfile);

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
app.get('/api/notifications/preferences', protect, notificationController.getPreferences);
app.put('/api/notifications/preferences', protect, notificationController.updatePreferences);

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));