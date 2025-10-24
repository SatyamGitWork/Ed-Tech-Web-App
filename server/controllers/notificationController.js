const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const { sendEmail } = require('../utils/sendEmail');

/**
 * Create a notification
 * Can be triggered by various events
 */
const createNotification = async ({
    recipient,
    sender,
    type,
    title,
    message,
    actionUrl,
    metadata = {},
    priority = 'medium',
    sendEmail: shouldSendEmail = true
}) => {
    try {
        // Create notification
        const notification = await Notification.create({
            recipient,
            sender,
            type,
            title,
            message,
            actionUrl,
            metadata,
            priority
        });

        // Check if email should be sent
        if (shouldSendEmail) {
            await sendNotificationEmail(notification);
        }

        // Emit socket event (will be added later)
        // io.to(recipient).emit('new_notification', notification);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Send notification email
 */
const sendNotificationEmail = async (notification) => {
    try {
        // Get user preferences
        const User = require('../models/User');
        const user = await User.findById(notification.recipient);
        
        if (!user) return;

        const preferences = await NotificationPreference.findOne({ user: user._id });
        
        // Check if user wants email notifications for this type
        const typeMap = {
            'new_content': 'newContent',
            'assignment_created': 'assignments',
            'assignment_graded': 'assignments',
            'course_update': 'courseUpdates',
            'enrollment': 'enrollment',
            'announcement': 'announcements',
            'message': 'messages'
        };
        
        const prefKey = typeMap[notification.type];
        if (preferences && prefKey && !preferences.emailNotifications[prefKey]) {
            return; // User doesn't want this type of email
        }

        // Check quiet hours
        if (preferences?.quietHours.enabled) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            if (currentTime >= preferences.quietHours.startTime || currentTime <= preferences.quietHours.endTime) {
                return; // In quiet hours
            }
        }

        // Send email
        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">🔔 ${notification.title}</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px;">
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        ${notification.message}
                    </p>
                    ${notification.actionUrl ? `
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="${notification.actionUrl}" 
                               style="background: #667eea; color: white; padding: 12px 30px; 
                                      text-decoration: none; border-radius: 5px; display: inline-block;">
                                View Details
                            </a>
                        </div>
                    ` : ''}
                    <p style="margin-top: 30px; font-size: 14px; color: #666;">
                        This notification was sent because you're enrolled in a course or have notifications enabled.
                        <br><br>
                        <a href="${process.env.CLIENT_URL || 'http://localhost:5000'}/settings" style="color: #667eea;">
                            Manage notification preferences
                        </a>
                    </p>
                </div>
            </div>
        `;

        await sendEmail(user.email, notification.title, emailHTML);
        
        // Mark email as sent
        notification.isEmailSent = true;
        await notification.save();

    } catch (error) {
        console.error('Error sending notification email:', error);
    }
};

/**
 * Get user notifications
 * @route GET /api/notifications
 */
const getNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        
        const query = { recipient: req.user._id };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('sender', 'name')
            .populate('metadata.courseId', 'title');

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({
            success: true,
            notifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

/**
 * Mark notification as read
 * @route PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification'
        });
    }
};

/**
 * Mark all notifications as read
 * @route PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notifications'
        });
    }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
};

/**
 * Get notification preferences
 * @route GET /api/notifications/preferences
 */
const getPreferences = async (req, res) => {
    try {
        let preferences = await NotificationPreference.findOne({ user: req.user._id });
        
        // Create default preferences if not exists
        if (!preferences) {
            preferences = await NotificationPreference.create({ user: req.user._id });
        }

        res.json({
            success: true,
            preferences
        });
    } catch (error) {
        console.error('Error fetching preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch preferences'
        });
    }
};

/**
 * Update notification preferences
 * @route PUT /api/notifications/preferences
 */
const updatePreferences = async (req, res) => {
    try {
        let preferences = await NotificationPreference.findOne({ user: req.user._id });
        
        if (!preferences) {
            preferences = await NotificationPreference.create({
                user: req.user._id,
                ...req.body
            });
        } else {
            preferences = await NotificationPreference.findOneAndUpdate(
                { user: req.user._id },
                req.body,
                { new: true, runValidators: true }
            );
        }

        res.json({
            success: true,
            message: 'Preferences updated successfully',
            preferences
        });
    } catch (error) {
        console.error('Error updating preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences'
        });
    }
};

/**
 * Get unread count
 * @route GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.json({
            success: true,
            count
        });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get unread count'
        });
    }
};

module.exports = {
    createNotification,
    sendNotificationEmail,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getPreferences,
    updatePreferences,
    getUnreadCount
};
