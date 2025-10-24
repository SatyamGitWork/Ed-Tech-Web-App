const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Teacher
const createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            classLevel,
            subject,
            difficulty,
            price,
            thumbnail,
            duration,
            requirements,
            whatYouWillLearn,
            tags
        } = req.body;

        // Create course with teacher as the logged-in user
        const course = await Course.create({
            title,
            description,
            teacher: req.user._id,
            category,
            classLevel,
            subject,
            difficulty,
            price: price || 0,
            thumbnail,
            duration,
            requirements,
            whatYouWillLearn,
            tags
        });

        res.status(201).json({
            success: true,
            course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    }
};

// @desc    Get all courses with filters
// @route   GET /api/courses
// @access  Public
const getCourses = async (req, res) => {
    try {
        const {
            category,
            classLevel,
            difficulty,
            minPrice,
            maxPrice,
            search
        } = req.query;

        // Build query
        let query = { isPublished: true };

        if (category) query.category = category;
        if (classLevel) query.classLevel = classLevel;
        if (difficulty) query.difficulty = difficulty;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }
        if (search) {
            query.$text = { $search: search };
        }

        const courses = await Course.find(query)
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses',
            error: error.message
        });
    }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('teacher', 'name email mobile')
            .populate('enrolledStudents', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        res.json({
            success: true,
            course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course',
            error: error.message
        });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Teacher (own courses only)
const updateCourse = async (req, res) => {
    try {
        let course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this course'
            });
        }

        course = await Course.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update course',
            error: error.message
        });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Teacher (own courses only)
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this course'
            });
        }

        // Delete all enrollments for this course
        await Enrollment.deleteMany({ course: req.params.id });

        // Delete the course
        await course.deleteOne();

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete course',
            error: error.message
        });
    }
};

// @desc    Get courses created by logged-in teacher
// @route   GET /api/courses/my/created
// @access  Private/Teacher
const getMyCreatedCourses = async (req, res) => {
    try {
        const courses = await Course.find({ teacher: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: courses.length,
            courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your courses',
            error: error.message
        });
    }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private/Student
const enrollInCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            student: req.user._id,
            course: req.params.id
        });

        if (existingEnrollment) {
            return res.status(400).json({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            student: req.user._id,
            course: req.params.id
        });

        // Add student to course's enrolledStudents array
        course.enrolledStudents.push(req.user._id);
        await course.save();

        // Send notification to teacher
        await createNotification({
            recipient: course.teacher,
            sender: req.user._id,
            type: 'enrollment',
            title: 'New Student Enrolled',
            message: `${req.user.name} has enrolled in your course "${course.title}"`,
            actionUrl: `/course-detail.html?id=${course._id}`,
            metadata: {
                courseId: course._id
            },
            priority: 'medium'
        });

        res.status(201).json({
            success: true,
            message: 'Successfully enrolled in course',
            enrollment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to enroll in course',
            error: error.message
        });
    }
};

// @desc    Get student's enrolled courses
// @route   GET /api/courses/my/enrolled
// @access  Private/Student
const getMyEnrolledCourses = async (req, res) => {
    try {
        const enrollments = await Enrollment.find({ student: req.user._id })
            .populate({
                path: 'course',
                populate: {
                    path: 'teacher',
                    select: 'name email'
                }
            })
            .sort({ enrollmentDate: -1 });

        res.json({
            success: true,
            count: enrollments.length,
            enrollments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enrolled courses',
            error: error.message
        });
    }
};

// @desc    Add content to course
// @route   POST /api/courses/:id/content
// @access  Private/Teacher
const addCourseContent = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add content to this course'
            });
        }

        const { title, type, url, description, duration, order } = req.body;

        course.content.push({
            title,
            type,
            url,
            description,
            duration,
            order: order || course.content.length
        });

        await course.save();

        // Get all enrolled students to send notifications
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        // Send notification to all enrolled students
        const notificationPromises = enrollments.map(enrollment => 
            createNotification({
                recipient: enrollment.student,
                sender: req.user._id,
                type: 'new_content',
                title: `New content added to ${course.title}`,
                message: `${req.user.name} added new ${type}: "${title}" to ${course.title}`,
                actionUrl: `/course-detail.html?id=${course._id}`,
                metadata: {
                    courseId: course._id,
                    contentId: course.content[course.content.length - 1]._id
                },
                priority: 'medium'
            })
        );

        await Promise.allSettled(notificationPromises);

        res.status(201).json({
            success: true,
            message: 'Content added successfully',
            course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add content',
            error: error.message
        });
    }
};

// @desc    Get course statistics for teacher
// @route   GET /api/courses/:id/stats
// @access  Private/Teacher
const getCourseStats = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view course statistics'
            });
        }

        const enrollmentCount = await Enrollment.countDocuments({ course: req.params.id });
        const activeEnrollments = await Enrollment.countDocuments({
            course: req.params.id,
            status: 'active'
        });
        const completedEnrollments = await Enrollment.countDocuments({
            course: req.params.id,
            status: 'completed'
        });

        res.json({
            success: true,
            stats: {
                totalEnrollments: enrollmentCount,
                activeStudents: activeEnrollments,
                completedStudents: completedEnrollments,
                rating: course.rating,
                totalRatings: course.totalRatings
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course statistics',
            error: error.message
        });
    }
};

// @desc    Delete content from course
// @route   DELETE /api/courses/:id/content/:contentId
// @access  Private/Teacher
const deleteContentFromCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete content from this course'
            });
        }

        // Remove content item by id
        course.content = course.content.filter(
            item => item._id.toString() !== req.params.contentId
        );

        await course.save();

        res.json({
            success: true,
            message: 'Content deleted successfully',
            course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete content',
            error: error.message
        });
    }
};

// @desc    Schedule a live class for course
// @route   POST /api/courses/:id/live-class
// @access  Private/Teacher
const scheduleLiveClass = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to schedule live classes for this course'
            });
        }

        const { title, description, scheduledDate, duration } = req.body;

        // Validate scheduled date is in the future
        if (new Date(scheduledDate) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled date must be in the future'
            });
        }

        // Generate unique stream key
        const crypto = require('crypto');
        const streamKey = crypto.randomBytes(16).toString('hex');

        course.liveClasses.push({
            title,
            description,
            scheduledDate,
            duration,
            streamKey
        });

        await course.save();

        const newLiveClass = course.liveClasses[course.liveClasses.length - 1];

        // Get all enrolled students to send notifications
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        // Format date for notification
        const classDate = new Date(scheduledDate);
        const dateStr = classDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        const timeStr = classDate.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Send notification to all enrolled students
        const notificationPromises = enrollments.map(enrollment => 
            createNotification({
                recipient: enrollment.student,
                sender: req.user._id,
                type: 'course_update',
                title: `Live class scheduled for ${course.title}`,
                message: `${req.user.name} scheduled a live class "${title}" on ${dateStr} at ${timeStr}`,
                actionUrl: `/course-detail.html?id=${course._id}`,
                metadata: {
                    courseId: course._id,
                    liveClassId: newLiveClass._id
                },
                priority: 'high'
            })
        );

        await Promise.allSettled(notificationPromises);

        res.status(201).json({
            success: true,
            message: 'Live class scheduled successfully',
            liveClass: newLiveClass,
            notificationsSent: enrollments.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to schedule live class',
            error: error.message
        });
    }
};

// @desc    Update live class
// @route   PUT /api/courses/:id/live-class/:liveClassId
// @access  Private/Teacher
const updateLiveClass = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update live classes for this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        // Update fields if provided
        const { title, description, meetingLink, scheduledDate, duration, isCompleted, recordingUrl } = req.body;
        
        if (title) liveClass.title = title;
        if (description) liveClass.description = description;
        if (meetingLink) liveClass.meetingLink = meetingLink;
        if (scheduledDate) {
            if (new Date(scheduledDate) < new Date() && !isCompleted) {
                return res.status(400).json({
                    success: false,
                    message: 'Scheduled date must be in the future'
                });
            }
            liveClass.scheduledDate = scheduledDate;
        }
        if (duration) liveClass.duration = duration;
        if (typeof isCompleted !== 'undefined') liveClass.isCompleted = isCompleted;
        if (recordingUrl) liveClass.recordingUrl = recordingUrl;

        await course.save();

        // If class time or details changed, notify enrolled students
        if (scheduledDate || title || description) {
            const enrollments = await Enrollment.find({ 
                course: course._id, 
                status: 'active' 
            });

            const classDate = new Date(liveClass.scheduledDate);
            const dateStr = classDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const timeStr = classDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const notificationPromises = enrollments.map(enrollment => 
                createNotification({
                    recipient: enrollment.student,
                    sender: req.user._id,
                    type: 'course_update',
                    title: `Live class updated: ${course.title}`,
                    message: `Live class "${liveClass.title}" has been rescheduled to ${dateStr} at ${timeStr}`,
                    actionUrl: `/course-detail.html?id=${course._id}`,
                    metadata: {
                        courseId: course._id,
                        liveClassId: liveClass._id
                    },
                    priority: 'high'
                })
            );

            await Promise.allSettled(notificationPromises);
        }

        res.json({
            success: true,
            message: 'Live class updated successfully',
            liveClass
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update live class',
            error: error.message
        });
    }
};

// @desc    Delete live class
// @route   DELETE /api/courses/:id/live-class/:liveClassId
// @access  Private/Teacher
const deleteLiveClass = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete live classes from this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        const liveClassTitle = liveClass.title;
        liveClass.deleteOne();
        await course.save();

        // Notify enrolled students about cancellation
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        const notificationPromises = enrollments.map(enrollment => 
            createNotification({
                recipient: enrollment.student,
                sender: req.user._id,
                type: 'course_update',
                title: `Live class cancelled: ${course.title}`,
                message: `The live class "${liveClassTitle}" has been cancelled`,
                actionUrl: `/course-detail.html?id=${course._id}`,
                metadata: {
                    courseId: course._id
                },
                priority: 'high'
            })
        );

        await Promise.allSettled(notificationPromises);

        res.json({
            success: true,
            message: 'Live class deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete live class',
            error: error.message
        });
    }
};

// @desc    Start live stream
// @route   POST /api/courses/:id/live-class/:liveClassId/start
// @access  Private/Teacher
const startLiveStream = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to start stream for this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        // Allow resuming if already live (e.g., page refresh, reconnection)
        const isResuming = liveClass.isLive;
        
        // Set stream as live
        liveClass.isLive = true;
        if (!isResuming) {
            liveClass.currentViewerCount = 0;
        }
        await course.save();

        // Get all enrolled students to send notifications
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        let notificationsSent = 0;
        
        // Only send notifications if this is a fresh start, not a resume
        if (!isResuming) {
            // Send notification to all enrolled students
            const notificationPromises = enrollments.map(enrollment => 
                createNotification({
                    recipient: enrollment.student,
                    sender: req.user._id,
                    type: 'course_update',
                    title: `${course.title} is LIVE now!`,
                    message: `${req.user.name} started live streaming "${liveClass.title}". Join now!`,
                    actionUrl: `/live-stream.html?streamKey=${liveClass.streamKey}`,
                    metadata: {
                        courseId: course._id,
                        liveClassId: liveClass._id,
                        streamKey: liveClass.streamKey
                    },
                    priority: 'urgent'
                })
            );

            await Promise.allSettled(notificationPromises);
            notificationsSent = enrollments.length;
        }

        res.json({
            success: true,
            message: isResuming ? 'Stream resumed successfully' : 'Stream started successfully',
            streamKey: liveClass.streamKey,
            liveClass,
            notificationsSent,
            isResuming
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start stream',
            error: error.message
        });
    }
};

// @desc    Stop live stream
// @route   POST /api/courses/:id/live-class/:liveClassId/stop
// @access  Private/Teacher
const stopLiveStream = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to stop stream for this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        // Set stream as offline
        liveClass.isLive = false;
        liveClass.isCompleted = true; // Mark as completed
        
        // Update peak viewer count if current is higher
        if (liveClass.currentViewerCount > liveClass.peakViewerCount) {
            liveClass.peakViewerCount = liveClass.currentViewerCount;
        }
        
        await course.save();

        res.json({
            success: true,
            message: 'Stream stopped successfully',
            stats: {
                peakViewers: liveClass.peakViewerCount,
                totalMessages: liveClass.chatMessages.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to stop stream',
            error: error.message
        });
    }
};

// @desc    Get live class details
// @route   GET /api/courses/:id/live-class/:liveClassId
// @access  Public (but needs enrollment check in frontend)
const getLiveClassDetails = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('teacher', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        res.json({
            success: true,
            liveClass,
            course: {
                _id: course._id,
                title: course.title,
                teacher: course.teacher
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get live class details',
            error: error.message
        });
    }
};

// @desc    Get live class by stream key
// @route   GET /api/live-stream/:streamKey
// @access  Public
const getLiveStreamByKey = async (req, res) => {
    try {
        const { streamKey } = req.params;
        
        const course = await Course.findOne({ 'liveClasses.streamKey': streamKey })
            .populate('teacher', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Stream not found'
            });
        }

        const liveClass = course.liveClasses.find(lc => lc.streamKey === streamKey);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        // Check if user is enrolled (require authentication via protect middleware)
        let isEnrolled = false;
        let isTeacher = false;
        
        if (req.user && req.user.id) {
            // Check if user is the teacher
            isTeacher = course.teacher._id.toString() === req.user.id.toString();
            
            if (!isTeacher) {
                // Check if user is enrolled
                const enrollment = await Enrollment.findOne({
                    course: course._id,
                    student: req.user.id,
                    status: 'active'
                });
                isEnrolled = !!enrollment;
                
                // If not enrolled and not the teacher, deny access
                if (!isEnrolled) {
                    return res.status(403).json({
                        success: false,
                        message: 'You must be enrolled in this course to access the stream. Please enroll first.'
                    });
                }
            }
        }

        res.json({
            success: true,
            liveClass,
            course: {
                _id: course._id,
                title: course.title,
                teacher: course.teacher
            },
            isEnrolled
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get stream',
            error: error.message
        });
    }
};

// @desc    Add recording URL to completed live class
// @route   POST /api/courses/:id/live-class/:liveClassId/recording
// @access  Private/Teacher
const addRecordingUrl = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to add recording for this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        const { recordingUrl } = req.body;

        if (!recordingUrl) {
            return res.status(400).json({
                success: false,
                message: 'Recording URL is required'
            });
        }

        liveClass.recordingUrl = recordingUrl;
        liveClass.isCompleted = true; // Ensure it's marked as completed
        
        await course.save();

        // Notify enrolled students that recording is available
        const Enrollment = require('../models/Enrollment');
        const { createNotification } = require('./notificationController');
        
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        const notificationPromises = enrollments.map(enrollment => 
            createNotification({
                recipient: enrollment.student,
                sender: req.user._id,
                type: 'course_update',
                title: `Recording available: ${liveClass.title}`,
                message: `The recording for "${liveClass.title}" is now available to watch in ${course.title}`,
                actionUrl: `/course-detail.html?id=${course._id}`,
                metadata: {
                    courseId: course._id,
                    liveClassId: liveClass._id
                },
                priority: 'normal'
            })
        );

        await Promise.allSettled(notificationPromises);

        res.json({
            success: true,
            message: 'Recording URL added successfully',
            liveClass,
            notificationsSent: enrollments.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add recording URL',
            error: error.message
        });
    }
};

// @desc    Upload recording file to Google Drive
// @route   POST /api/courses/:id/live-class/:liveClassId/upload-recording
// @access  Private/Teacher
const uploadRecording = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to upload recording for this course'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No recording file uploaded'
            });
        }

        // Import uploadToGoogleDrive function
        const { uploadToGoogleDrive, FOLDERS } = require('../config/googleDrive');

        // Upload file to Google Drive
        const driveResult = await uploadToGoogleDrive(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            FOLDERS.VIDEOS
        );
        
        // Update recording metadata
        liveClass.recordingUrl = driveResult.webViewLink; // Google Drive view link
        liveClass.recordingFileSize = req.file.size;
        liveClass.recordingStatus = 'available';
        liveClass.recordingCompletedAt = new Date();
        liveClass.isCompleted = true;

        await course.save();

        // Notify enrolled students
        const Enrollment = require('../models/Enrollment');
        const { createNotification } = require('./notificationController');
        
        const enrollments = await Enrollment.find({ 
            course: course._id, 
            status: 'active' 
        });

        const notificationPromises = enrollments.map(enrollment => 
            createNotification({
                recipient: enrollment.student,
                sender: req.user._id,
                type: 'course_update',
                title: `Recording available: ${liveClass.title}`,
                message: `The recording for "${liveClass.title}" is now available to watch!`,
                actionUrl: `/course-detail.html?id=${course._id}`,
                metadata: {
                    courseId: course._id,
                    liveClassId: liveClass._id
                },
                priority: 'normal'
            })
        );

        await Promise.allSettled(notificationPromises);

        res.json({
            success: true,
            message: 'Recording uploaded successfully',
            recordingUrl: liveClass.recordingUrl,
            fileSize: liveClass.recordingFileSize,
            notificationsSent: enrollments.length
        });
    } catch (error) {
        console.error('Upload recording error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload recording',
            error: error.message
        });
    }
};

// @desc    Update recording status (for client-side recording)
// @route   PATCH /api/courses/:id/live-class/:liveClassId/recording-status
// @access  Private/Teacher
const updateRecordingStatus = async (req, res) => {
    try {
        const { status, duration } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the course teacher
        if (course.teacher.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const liveClass = course.liveClasses.id(req.params.liveClassId);

        if (!liveClass) {
            return res.status(404).json({
                success: false,
                message: 'Live class not found'
            });
        }

        // Update recording status
        if (status) liveClass.recordingStatus = status;
        if (duration) liveClass.recordingDuration = duration;

        if (status === 'recording') {
            liveClass.recordingStartedAt = new Date();
        } else if (status === 'available') {
            liveClass.recordingCompletedAt = new Date();
        }

        await course.save();

        res.json({
            success: true,
            message: 'Recording status updated',
            recordingStatus: liveClass.recordingStatus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update recording status',
            error: error.message
        });
    }
};

module.exports = {
    createCourse,
    getCourses,
    getCourseById,
    updateCourse,
    deleteCourse,
    getMyCreatedCourses,
    enrollInCourse,
    getMyEnrolledCourses,
    addCourseContent,
    deleteContentFromCourse,
    getCourseStats,
    scheduleLiveClass,
    updateLiveClass,
    deleteLiveClass,
    startLiveStream,
    stopLiveStream,
    getLiveClassDetails,
    getLiveStreamByKey,
    addRecordingUrl,
    uploadRecording,
    updateRecordingStatus
};
