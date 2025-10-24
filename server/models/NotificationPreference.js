const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    
    // Email notification preferences
    emailNotifications: {
        newContent: { type: Boolean, default: true },
        assignments: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        enrollment: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: false },
        marketing: { type: Boolean, default: false }
    },
    
    // In-app notification preferences
    inAppNotifications: {
        newContent: { type: Boolean, default: true },
        assignments: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        enrollment: { type: Boolean, default: true },
        messages: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true }
    },
    
    // Notification frequency
    frequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly', 'never'],
        default: 'instant'
    },
    
    // Quiet hours (no notifications during this time)
    quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: { type: String, default: '22:00' },  // 10 PM
        endTime: { type: String, default: '08:00' }     // 8 AM
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
