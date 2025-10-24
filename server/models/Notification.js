const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'new_content',      // New content added to enrolled course
            'assignment_created', // New assignment posted
            'assignment_graded', // Assignment graded
            'course_update',    // Course information updated
            'enrollment',       // New student enrolled (for teachers)
            'announcement',     // General announcement
            'quiz_available',   // New quiz available
            'certificate',      // Certificate earned
            'payment_success',  // Payment successful
            'payment_failed',   // Payment failed
            'course_reminder',  // Course deadline reminder
            'message',          // Direct message
            'system'           // System notification
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    actionUrl: {
        type: String  // URL to navigate when clicked
    },
    metadata: {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course'
        },
        contentId: String,
        assignmentId: String,
        // Add more as needed
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    },
    isEmailSent: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Virtual for time ago
notificationSchema.virtual('timeAgo').get(function() {
    const seconds = Math.floor((new Date() - this.createdAt) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
});

// Set virtuals to be included in JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Notification', notificationSchema);
