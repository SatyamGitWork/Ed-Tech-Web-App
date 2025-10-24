const mongoose = require('mongoose');

const courseContentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['video', 'pdf', 'assignment', 'text'],
        required: true
    },
    url: {
        type: String,
        required: false // Not required for text type
    },
    description: {
        type: String
    },
    duration: {
        type: Number, // in minutes
        required: false
    },
    order: {
        type: Number,
        default: 0
    }
});

const liveClassSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    scheduledDate: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true
    },
    isLive: {
        type: Boolean,
        default: false
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    streamKey: {
        type: String,
        unique: true,
        sparse: true
    },
    viewers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    currentViewerCount: {
        type: Number,
        default: 0
    },
    peakViewerCount: {
        type: Number,
        default: 0
    },
    recordingUrl: {
        type: String
    },
    recordingDuration: {
        type: Number // Duration in seconds
    },
    recordingFileSize: {
        type: Number // Size in bytes
    },
    recordingStatus: {
        type: String,
        enum: ['not_recorded', 'recording', 'processing', 'available', 'failed'],
        default: 'not_recorded'
    },
    recordingStartedAt: {
        type: Date
    },
    recordingCompletedAt: {
        type: Date
    },
    chatMessages: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        userName: String,
        message: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const courseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Other']
    },
    classLevel: {
        type: String,
        required: true,
        enum: ['6', '7', '8', '9', '10', '11', '12']
    },
    subject: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced'],
        default: 'Beginner'
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    thumbnail: {
        type: String,
        default: 'https://img.icons8.com/clouds/200/000000/book.png'
    },
    content: [courseContentSchema],
    liveClasses: [liveClassSchema],
    duration: {
        type: Number, // Total course duration in hours
        default: 0
    },
    enrolledStudents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String
    }],
    requirements: {
        type: String
    },
    whatYouWillLearn: [{
        type: String
    }]
}, {
    timestamps: true
});

// Index for search and filter
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, classLevel: 1, difficulty: 1 });

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
