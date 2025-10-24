// Test script for Notification System
// Run with: node test-notifications.js

const API_URL = 'http://localhost:5000/api';

// Test credentials (replace with actual user tokens)
const TEACHER_TOKEN = 'your-teacher-jwt-token';
const STUDENT_TOKEN = 'your-student-jwt-token';
const COURSE_ID = 'your-course-id';

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', body = null, token = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    return await response.json();
}

// Test 1: Add content and check notifications
async function testContentNotification() {
    console.log('\n📚 Test 1: Content Notification');
    console.log('================================');

    try {
        const result = await apiCall(
            `/courses/${COURSE_ID}/content`,
            'POST',
            {
                title: 'Test Video - React Basics',
                type: 'video',
                url: 'https://example.com/video.mp4',
                description: 'Introduction to React',
                duration: 30
            },
            TEACHER_TOKEN
        );

        console.log('✅ Content added:', result.message);
        console.log('📊 Course has', result.course.content.length, 'content items');

        // Check student notifications
        setTimeout(async () => {
            const notifications = await apiCall('/notifications', 'GET', null, STUDENT_TOKEN);
            console.log('\n🔔 Student received', notifications.unreadCount, 'new notifications');
            if (notifications.notifications.length > 0) {
                console.log('📄 Latest notification:', notifications.notifications[0].title);
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test 2: Schedule live class
async function testLiveClassNotification() {
    console.log('\n📅 Test 2: Live Class Notification');
    console.log('===================================');

    try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 1 week from now

        const result = await apiCall(
            `/courses/${COURSE_ID}/live-class`,
            'POST',
            {
                title: 'Physics Live Session - Newton\'s Laws',
                description: 'Interactive discussion on laws of motion',
                meetingLink: 'https://zoom.us/j/123456789',
                scheduledDate: futureDate.toISOString(),
                duration: 60
            },
            TEACHER_TOKEN
        );

        console.log('✅ Live class scheduled:', result.message);
        console.log('📊 Notifications sent to', result.notificationsSent, 'students');
        console.log('📅 Scheduled for:', new Date(result.liveClass.scheduledDate).toLocaleString());

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test 3: Get notifications
async function testGetNotifications() {
    console.log('\n🔔 Test 3: Get Notifications');
    console.log('=============================');

    try {
        const result = await apiCall('/notifications?limit=5', 'GET', null, STUDENT_TOKEN);

        console.log('✅ Total notifications:', result.pagination.total);
        console.log('📊 Unread count:', result.unreadCount);
        console.log('\nRecent notifications:');
        
        result.notifications.forEach((notif, index) => {
            const icon = notif.isRead ? '✓' : '●';
            console.log(`${icon} ${index + 1}. ${notif.title}`);
            console.log(`   ${notif.message}`);
            console.log(`   ${notif.createdAt}\n`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test 4: Mark notification as read
async function testMarkAsRead() {
    console.log('\n✅ Test 4: Mark as Read');
    console.log('========================');

    try {
        // Get first notification
        const notifications = await apiCall('/notifications?limit=1&unreadOnly=true', 'GET', null, STUDENT_TOKEN);
        
        if (notifications.notifications.length === 0) {
            console.log('ℹ️  No unread notifications to mark');
            return;
        }

        const notifId = notifications.notifications[0]._id;
        console.log('📄 Marking notification as read:', notifications.notifications[0].title);

        const result = await apiCall(`/notifications/${notifId}/read`, 'PUT', null, STUDENT_TOKEN);
        console.log('✅ Marked as read:', result.success);

        // Check updated count
        const updated = await apiCall('/notifications/unread-count', 'GET', null, STUDENT_TOKEN);
        console.log('📊 New unread count:', updated.count);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Test 5: Get notification preferences
async function testGetPreferences() {
    console.log('\n⚙️  Test 5: Notification Preferences');
    console.log('====================================');

    try {
        const result = await apiCall('/notifications/preferences', 'GET', null, STUDENT_TOKEN);

        console.log('✅ Email notifications:');
        console.log('   - New Content:', result.preferences.emailNotifications.newContent);
        console.log('   - Course Updates:', result.preferences.emailNotifications.courseUpdates);
        console.log('   - Assignments:', result.preferences.emailNotifications.assignments);
        
        console.log('\n📱 In-app notifications:');
        console.log('   - New Content:', result.preferences.inAppNotifications.newContent);
        console.log('   - Course Updates:', result.preferences.inAppNotifications.courseUpdates);
        
        console.log('\n⏰ Settings:');
        console.log('   - Frequency:', result.preferences.frequency);
        console.log('   - Quiet Hours:', result.preferences.quietHours.enabled);
        if (result.preferences.quietHours.enabled) {
            console.log(`   - Time: ${result.preferences.quietHours.startTime} to ${result.preferences.quietHours.endTime}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Notification System Tests');
    console.log('======================================\n');

    if (TEACHER_TOKEN === 'your-teacher-jwt-token') {
        console.log('⚠️  WARNING: Please update the test tokens and course ID in this file!');
        console.log('\nTo get tokens:');
        console.log('1. Login as teacher/student in browser');
        console.log('2. Open browser console');
        console.log('3. Type: localStorage.getItem("userToken")');
        console.log('4. Copy the token value\n');
        return;
    }

    await testContentNotification();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testLiveClassNotification();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await testGetNotifications();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testMarkAsRead();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await testGetPreferences();

    console.log('\n✅ All tests completed!');
}

// Run tests if executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testContentNotification,
    testLiveClassNotification,
    testGetNotifications,
    testMarkAsRead,
    testGetPreferences
};
