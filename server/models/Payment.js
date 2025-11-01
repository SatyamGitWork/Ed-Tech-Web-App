const mongoose = require('mongoose');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true // Cannot be changed after creation
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true,
        immutable: true // Cannot be changed after creation
    },
    orderId: {
        type: String,
        required: true,
        unique: true,
        immutable: true // Cannot be changed after creation
    },
    paymentId: {
        type: String,
        default: null
    },
    signature: {
        type: String,
        default: null,
        select: false // Don't include in queries by default (security)
    },
    amount: {
        type: Number,
        required: true,
        immutable: true // Cannot be changed after creation
    },
    currency: {
        type: String,
        default: 'INR',
        immutable: true // Cannot be changed after creation
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'stripe', 'free'],
        default: 'razorpay',
        immutable: true // Cannot be changed after creation
    },
    receipt: {
        type: String,
        immutable: true // Cannot be changed after creation
    },
    failureReason: {
        type: String
    },
    refundId: {
        type: String
    },
    refundAmount: {
        type: Number
    },
    // Audit trail fields
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String
    }],
    // Data integrity hash
    dataHash: {
        type: String,
        select: false // Don't include in queries by default
    },
    // IP address for security tracking
    ipAddress: {
        type: String,
        select: false
    },
    // User agent for security tracking
    userAgent: {
        type: String,
        select: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true // Cannot be changed after creation
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-save middleware to create data integrity hash
paymentSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('status') || this.isModified('amount')) {
        // Create hash of critical fields
        const dataString = `${this.orderId}|${this.amount}|${this.status}|${this.user}|${this.course}`;
        this.dataHash = crypto.createHash('sha256').update(dataString).digest('hex');
    }
    next();
});

// Method to verify data integrity
paymentSchema.methods.verifyIntegrity = function() {
    const dataString = `${this.orderId}|${this.amount}|${this.status}|${this.user}|${this.course}`;
    const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
    return this.dataHash === currentHash;
};

// Middleware to prevent critical field updates
paymentSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    
    // Prevent updating immutable fields
    const immutableFields = ['user', 'course', 'orderId', 'amount', 'currency', 'paymentMethod', 'receipt', 'createdAt'];
    
    for (const field of immutableFields) {
        if (update.$set && update.$set[field]) {
            return next(new Error(`Cannot update immutable field: ${field}`));
        }
        if (update[field]) {
            return next(new Error(`Cannot update immutable field: ${field}`));
        }
    }
    
    next();
});

// Middleware to track status changes
paymentSchema.pre('save', function(next) {
    if (this.isModified('status') && !this.isNew) {
        if (!this.statusHistory) {
            this.statusHistory = [];
        }
        this.statusHistory.push({
            status: this.status,
            changedAt: new Date(),
            reason: this.failureReason || 'Status updated'
        });
    }
    next();
});

// Index for faster queries
paymentSchema.index({ user: 1, course: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
