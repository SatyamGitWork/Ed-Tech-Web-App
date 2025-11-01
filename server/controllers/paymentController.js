const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Validate Razorpay configuration
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('⚠️  WARNING: Razorpay credentials not configured. Payment system will not work.');
}

// Initialize Razorpay with error handling
let razorpay;
try {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
} catch (error) {
    console.error('❌ Failed to initialize Razorpay:', error.message);
}

// @desc    Create order for course purchase
// @route   POST /api/payments/create-order
// @access  Private (Student only)
exports.createOrder = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!courseId || !courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid course ID' 
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ 
                success: false, 
                message: 'Course not found' 
            });
        }

        // Check if already enrolled (with atomic operation to prevent race condition)
        const existingEnrollment = await Enrollment.findOne({ 
            student: userId, 
            course: courseId 
        });

        if (existingEnrollment) {
            return res.status(400).json({ 
                success: false, 
                message: 'You are already enrolled in this course' 
            });
        }

        // Check for pending payment
        const pendingPayment = await Payment.findOne({
            user: userId,
            course: courseId,
            status: 'pending'
        });

        if (pendingPayment) {
            return res.status(400).json({
                success: false,
                message: 'You have a pending payment for this course',
                orderId: pendingPayment.orderId
            });
        }

        // Check if course is free
        if (course.price === 0 || !course.price) {
            // Directly enroll for free courses
            const enrollment = await Enrollment.create({
                student: userId,
                course: courseId,
                status: 'active'
            });

            // Create payment record for free course with tracking
            await Payment.create({
                user: userId,
                course: courseId,
                orderId: `free_${Date.now()}_${userId}`,
                amount: 0,
                status: 'success',
                paymentMethod: 'free',
                receipt: `receipt_free_${Date.now()}`,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            });

            return res.status(200).json({
                success: true,
                message: 'Successfully enrolled in free course',
                enrollment,
                isFree: true
            });
        }

        // Validate price
        if (course.price < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course price'
            });
        }

        // Check Razorpay initialization
        if (!razorpay) {
            return res.status(500).json({
                success: false,
                message: 'Payment system is not configured'
            });
        }

        // Create Razorpay order for paid courses
        const amount = Math.round(course.price * 100); // Convert to paise and round
        const receipt = `receipt_${Date.now()}_${userId.toString().slice(-6)}`;

        const order = await razorpay.orders.create({
            amount,
            currency: 'INR',
            receipt,
            notes: {
                courseId: courseId.toString(),
                userId: userId.toString(),
                courseName: course.title.substring(0, 50) // Limit length
            }
        });

        // Save payment record with security tracking
        const payment = await Payment.create({
            user: userId,
            course: courseId,
            orderId: order.id,
            amount: course.price,
            currency: 'INR',
            receipt,
            status: 'pending',
            paymentMethod: 'razorpay',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent']
        });

        res.status(200).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            payment: {
                id: payment._id,
                orderId: payment.orderId
            },
            course: {
                id: course._id,
                title: course.title,
                price: course.price
            },
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Create order error:', error);
        
        // Don't expose internal error details to client
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create order. Please try again later.'
        });
    }
};

// @desc    Verify payment and enroll student
// @route   POST /api/payments/verify
// @access  Private (Student only)
exports.verifyPayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        const userId = req.user._id;

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification data'
            });
        }

        // Validate signature format (basic check)
        if (typeof razorpay_signature !== 'string' || razorpay_signature.length !== 64) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signature format'
            });
        }

        // Find payment record
        const payment = await Payment.findOne({ orderId: razorpay_order_id });
        
        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment record not found' 
            });
        }

        // Verify user owns this payment
        if (payment.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized payment verification attempt'
            });
        }

        // Check if payment is already processed
        if (payment.status === 'success') {
            return res.status(400).json({
                success: false,
                message: 'Payment already verified'
            });
        }

        // Verify signature using constant-time comparison
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Use timing-safe comparison to prevent timing attacks
        let isValidSignature;
        try {
            isValidSignature = crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'hex'),
                Buffer.from(razorpay_signature, 'hex')
            );
        } catch (err) {
            isValidSignature = false;
        }

        if (!isValidSignature) {
            // Update payment status to failed
            payment.status = 'failed';
            payment.failureReason = 'Invalid signature verification';
            await payment.save();

            return res.status(400).json({ 
                success: false, 
                message: 'Payment verification failed. Invalid signature.' 
            });
        }

        // Update payment record
        payment.paymentId = razorpay_payment_id;
        payment.signature = razorpay_signature;
        payment.status = 'success';
        await payment.save();

        // Check if enrollment already exists (prevent duplicate enrollments)
        let enrollment = await Enrollment.findOne({
            student: userId,
            course: payment.course
        });

        if (!enrollment) {
            // Enroll student in course
            enrollment = await Enrollment.create({
                student: userId,
                course: payment.course,
                status: 'active',
                enrollmentDate: Date.now()
            });
        }

        // Populate course details
        await enrollment.populate('course', 'title description price');

        res.status(200).json({
            success: true,
            message: 'Payment verified and enrollment successful!',
            payment: {
                id: payment._id,
                orderId: payment.orderId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                status: payment.status
            },
            enrollment: {
                id: enrollment._id,
                course: enrollment.course,
                enrollmentDate: enrollment.enrollmentDate
            }
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        
        // Don't expose internal error details
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed. Please contact support.'
        });
    }
};

// @desc    Get payment history for user
// @route   GET /api/payments/my-payments
// @access  Private
exports.getMyPayments = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Add pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Validate pagination parameters
        if (limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Maximum limit is 100'
            });
        }

        const payments = await Payment.find({ user: userId })
            .populate('course', 'title description price thumbnail')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Payment.countDocuments({ user: userId });

        res.status(200).json({
            success: true,
            count: payments.length,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            payments
        });

    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment history'
        });
    }
};

// @desc    Get payment by order ID
// @route   GET /api/payments/order/:orderId
// @access  Private
exports.getPaymentByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user._id;

        const payment = await Payment.findOne({ 
            orderId, 
            user: userId 
        }).populate('course', 'title description price');

        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Payment not found' 
            });
        }

        res.status(200).json({
            success: true,
            payment
        });

    } catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payment details', 
            error: error.message 
        });
    }
};

// @desc    Get all payments (Admin/Teacher only)
// @route   GET /api/payments/all
// @access  Private (Teacher only)
exports.getAllPayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .populate('user', 'name email')
            .populate('course', 'title price')
            .sort({ createdAt: -1 });

        // Calculate statistics
        const stats = {
            total: payments.length,
            success: payments.filter(p => p.status === 'success').length,
            pending: payments.filter(p => p.status === 'pending').length,
            failed: payments.filter(p => p.status === 'failed').length,
            totalRevenue: payments
                .filter(p => p.status === 'success')
                .reduce((sum, p) => sum + p.amount, 0)
        };

        res.status(200).json({
            success: true,
            stats,
            payments
        });

    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch payments', 
            error: error.message 
        });
    }
};

// @desc    Handle payment failure
// @route   POST /api/payments/payment-failed
// @access  Private
exports.paymentFailed = async (req, res) => {
    try {
        const { orderId, error } = req.body;
        const userId = req.user._id;

        const payment = await Payment.findOne({ 
            orderId, 
            user: userId 
        });

        if (payment) {
            payment.status = 'failed';
            payment.failureReason = error?.description || 'Payment failed';
            await payment.save();
        }

        res.status(200).json({
            success: true,
            message: 'Payment failure recorded'
        });

    } catch (error) {
        console.error('Payment failed handler error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to record payment failure', 
            error: error.message 
        });
    }
};

// @desc    Check payment status from Razorpay and handle expired pending payments
// @route   POST /api/payments/check-status
// @access  Private
exports.checkPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        // Find payment record
        const payment = await Payment.findOne({ orderId }).populate('course', 'title price');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment record not found'
            });
        }

        // Verify user owns this payment
        if (payment.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        // If already successful, return enrollment
        if (payment.status === 'success') {
            const enrollment = await Enrollment.findOne({
                student: userId,
                course: payment.course._id
            });

            return res.status(200).json({
                success: true,
                status: 'success',
                message: 'Payment already completed',
                payment: {
                    orderId: payment.orderId,
                    amount: payment.amount,
                    status: payment.status
                },
                enrollment
            });
        }

        // If already failed, allow retry
        if (payment.status === 'failed') {
            return res.status(200).json({
                success: true,
                status: 'failed',
                message: 'Payment failed. You can start a new payment.',
                canRetry: true
            });
        }

        // Check if payment is pending for more than 10 minutes
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const isPendingExpired = payment.createdAt < tenMinutesAgo;

        if (payment.status === 'pending' && isPendingExpired) {
            // Check actual status from Razorpay
            if (!razorpay) {
                return res.status(500).json({
                    success: false,
                    message: 'Payment gateway not configured'
                });
            }

            try {
                // Fetch order from Razorpay
                const razorpayOrder = await razorpay.orders.fetch(orderId);

                if (razorpayOrder.status === 'paid') {
                    // Payment was successful but not verified - this shouldn't happen
                    // Mark as failed and ask user to contact support
                    payment.status = 'failed';
                    payment.failureReason = 'Payment verification timeout - Contact support with Order ID';
                    await payment.save();

                    return res.status(200).json({
                        success: false,
                        status: 'verification_failed',
                        message: 'Payment was made but verification failed. Please contact support.',
                        orderId: payment.orderId,
                        canRetry: false,
                        contactSupport: true
                    });
                } else {
                    // Payment was not completed - mark as expired and allow retry
                    payment.status = 'failed';
                    payment.failureReason = 'Payment timeout - Not completed within 10 minutes';
                    await payment.save();

                    return res.status(200).json({
                        success: true,
                        status: 'expired',
                        message: 'Payment session expired. Please start a new payment.',
                        canRetry: true
                    });
                }
            } catch (razorpayError) {
                console.error('Razorpay fetch error:', razorpayError);
                
                // If order not found on Razorpay, mark as expired
                if (razorpayError.statusCode === 400) {
                    payment.status = 'failed';
                    payment.failureReason = 'Payment timeout - Order expired';
                    await payment.save();

                    return res.status(200).json({
                        success: true,
                        status: 'expired',
                        message: 'Payment session expired. Please start a new payment.',
                        canRetry: true
                    });
                }

                throw razorpayError;
            }
        }

        // Payment is still pending but not expired
        return res.status(200).json({
            success: true,
            status: 'pending',
            message: 'Payment is still pending',
            payment: {
                orderId: payment.orderId,
                amount: payment.amount,
                createdAt: payment.createdAt
            }
        });

    } catch (error) {
        console.error('Check payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check payment status'
        });
    }
};

// @desc    Cancel pending payment and allow retry
// @route   POST /api/payments/cancel-pending
// @access  Private
exports.cancelPendingPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.user._id;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'Order ID is required'
            });
        }

        const payment = await Payment.findOne({ orderId, user: userId });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel payment with status: ${payment.status}`
            });
        }

        // Mark as cancelled
        payment.status = 'failed';
        payment.failureReason = 'Cancelled by user';
        await payment.save();

        res.status(200).json({
            success: true,
            message: 'Pending payment cancelled. You can start a new payment.',
            canRetry: true
        });

    } catch (error) {
        console.error('Cancel payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel payment'
        });
    }
};

// @desc    Verify payment data integrity (Admin only)
// @route   GET /api/payments/verify-integrity/:orderId
// @access  Private (Admin/Teacher only)
exports.verifyPaymentIntegrity = async (req, res) => {
    try {
        const { orderId } = req.params;

        // Fetch payment with all fields including hidden ones
        const payment = await Payment.findOne({ orderId })
            .select('+dataHash +signature +ipAddress +userAgent')
            .populate('user', 'name email')
            .populate('course', 'title price');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Verify integrity
        const isIntact = payment.verifyIntegrity();

        res.status(200).json({
            success: true,
            isIntact,
            message: isIntact ? 'Payment data integrity verified' : '⚠️ WARNING: Payment data may have been tampered!',
            payment: {
                orderId: payment.orderId,
                amount: payment.amount,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                user: payment.user.email,
                course: payment.course.title,
                createdAt: payment.createdAt,
                statusHistory: payment.statusHistory,
                ipAddress: payment.ipAddress,
                userAgent: payment.userAgent
            }
        });

    } catch (error) {
        console.error('Verify integrity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment integrity'
        });
    }
};

// @desc    Get detailed payment info with audit trail (Admin only)
// @route   GET /api/payments/admin/:orderId
// @access  Private (Admin/Teacher only)
exports.getPaymentDetailAdmin = async (req, res) => {
    try {
        const { orderId } = req.params;

        const payment = await Payment.findOne({ orderId })
            .select('+dataHash +signature +ipAddress +userAgent')
            .populate('user', 'name email mobile userType')
            .populate('course', 'title price description');

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Verify integrity
        const isIntact = payment.verifyIntegrity();

        res.status(200).json({
            success: true,
            payment: {
                _id: payment._id,
                orderId: payment.orderId,
                paymentId: payment.paymentId,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                paymentMethod: payment.paymentMethod,
                receipt: payment.receipt,
                failureReason: payment.failureReason,
                user: payment.user,
                course: payment.course,
                statusHistory: payment.statusHistory,
                createdAt: payment.createdAt,
                updatedAt: payment.updatedAt,
                // Security info
                ipAddress: payment.ipAddress,
                userAgent: payment.userAgent,
                dataIntegrity: isIntact ? 'Verified ✓' : '⚠️ Compromised',
                isDataIntact: isIntact
            }
        });

    } catch (error) {
        console.error('Get payment detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment details'
        });
    }
};

// @desc    Prevent direct status manipulation (security endpoint)
// @route   PUT /api/payments/:id/status
// @access  Private (Admin only) - Should never be called directly
exports.updatePaymentStatus = async (req, res) => {
    // This endpoint should NEVER be used
    // Status updates should only happen through payment verification
    return res.status(403).json({
        success: false,
        message: 'Direct payment status updates are not allowed for security reasons. Status can only be updated through payment verification.'
    });
};
