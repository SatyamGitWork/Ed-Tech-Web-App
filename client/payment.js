
// ========== PAYMENT FUNCTIONS ==========

// Input sanitization helper
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Validate MongoDB ObjectID
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

// Create payment order and initiate Razorpay checkout
async function handleCourseEnrollment(courseId, courseTitle, coursePrice) {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
        showToast('Please login to enroll in this course', 'error');
        window.location.href = 'login.html';
        return;
    }

    // Validate courseId
    if (!courseId || !isValidObjectId(courseId)) {
        showToast('Invalid course ID', 'error');
        return;
    }

    // Validate coursePrice
    if (typeof coursePrice !== 'number' || coursePrice < 0) {
        showToast('Invalid course price', 'error');
        return;
    }

    try {
        // Show loading
        showToast('Processing...', 'info');

        // Create order with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(`${API_URL}/payments/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ courseId }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create order');
        }

        // Validate response data
        if (!data.success) {
            throw new Error(data.message || 'Order creation failed');
        }

        // Check if course is free
        if (data.isFree) {
            showToast('🎉 Successfully enrolled in the course!', 'success');
            setTimeout(() => {
                window.location.href = `course-detail.html?id=${courseId}`;
            }, 1500);
            return;
        }

        // Validate order data before opening Razorpay
        if (!data.razorpayKeyId || !data.order || !data.order.id) {
            throw new Error('Invalid order data received');
        }

        // Open Razorpay checkout for paid courses
        openRazorpayCheckout(data, sanitizeInput(courseTitle));

    } catch (error) {
        console.error('Enrollment error:', error);
        
        if (error.name === 'AbortError') {
            showToast('Request timeout. Please try again.', 'error');
        } else {
            showToast(error.message || 'Failed to process enrollment', 'error');
        }
    }
}

// Open Razorpay payment checkout
function openRazorpayCheckout(orderData, courseTitle) {
    // Validate Razorpay is loaded
    if (typeof Razorpay === 'undefined') {
        showToast('Payment system not loaded. Please refresh the page.', 'error');
        return;
    }

    // Validate required data
    if (!orderData || !orderData.razorpayKeyId || !orderData.order) {
        showToast('Invalid payment data', 'error');
        return;
    }

    const options = {
        key: orderData.razorpayKeyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Ed-Tech Platform',
        description: courseTitle.substring(0, 100), // Limit length
        image: 'https://img.icons8.com/color/96/000000/graduation-cap.png',
        order_id: orderData.order.id,
        handler: function (response) {
            // Payment successful, verify on backend
            verifyPayment(response, orderData.course.id);
        },
        prefill: {
            name: (localStorage.getItem('userName') || '').substring(0, 50),
            email: (localStorage.getItem('userEmail') || '').substring(0, 100),
            contact: (localStorage.getItem('userMobile') || '').substring(0, 15)
        },
        notes: {
            courseId: orderData.course.id,
            courseName: orderData.course.title.substring(0, 100)
        },
        theme: {
            color: '#2c68ff'
        },
        modal: {
            ondismiss: function() {
                showToast('Payment cancelled', 'error');
            },
            escape: true,
            backdropclose: false
        },
        retry: {
            enabled: false // Disable retry to prevent duplicate payments
        }
    };

    try {
        const rzp = new Razorpay(options);
        
        rzp.on('payment.failed', function (response) {
            handlePaymentFailure(response.error, orderData.order.id);
        });

        rzp.open();
    } catch (error) {
        console.error('Razorpay error:', error);
        showToast('Failed to open payment window. Please try again.', 'error');
    }
}

// Verify payment after successful payment
async function verifyPayment(paymentResponse, courseId) {
    const token = localStorage.getItem('userToken');

    try {
        showToast('Verifying payment...', 'info');

        const response = await fetch(`${API_URL}/payments/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('🎉 Payment successful! You are now enrolled.', 'success');
            
            // Redirect to course page after 2 seconds
            setTimeout(() => {
                window.location.href = `course-detail.html?id=${courseId}`;
            }, 2000);
        } else {
            throw new Error(data.message || 'Payment verification failed');
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        showToast('Payment verification failed. Please contact support.', 'error');
    }
}

// Handle payment failure
async function handlePaymentFailure(error, orderId) {
    const token = localStorage.getItem('userToken');

    console.error('Payment failed:', error);
    
    try {
        await fetch(`${API_URL}/payments/payment-failed`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderId,
                error: {
                    code: error.code,
                    description: error.description,
                    reason: error.reason
                }
            })
        });
    } catch (err) {
        console.error('Error recording payment failure:', err);
    }

    showToast(`Payment failed: ${error.description}`, 'error');
}

// Get user's payment history
async function loadPaymentHistory() {
    const token = localStorage.getItem('userToken');

    if (!token) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/payments/my-payments`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            return data.payments;
        } else {
            throw new Error(data.message);
        }

    } catch (error) {
        console.error('Error loading payment history:', error);
        return [];
    }
}

// Check payment status (for pending payments older than 10 minutes)
async function checkPendingPaymentStatus(orderId) {
    const token = localStorage.getItem('userToken');
    
    if (!token || !orderId) return null;

    try {
        const response = await fetch(`${API_URL}/payments/check-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId })
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error checking payment status:', error);
        return null;
    }
}

// Cancel pending payment
async function cancelPendingPayment(orderId) {
    const token = localStorage.getItem('userToken');
    
    if (!token || !orderId) return false;

    try {
        const response = await fetch(`${API_URL}/payments/cancel-pending`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId })
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            return true;
        } else {
            showToast(data.message, 'error');
            return false;
        }

    } catch (error) {
        console.error('Error cancelling payment:', error);
        showToast('Failed to cancel payment', 'error');
        return false;
    }
}

// Handle pending payment on page load (check if there's a pending payment)
async function checkForPendingPayment(courseId) {
    const token = localStorage.getItem('userToken');
    
    if (!token || !courseId) return;

    try {
        const payments = await loadPaymentHistory();
        const pendingPayment = payments.find(p => 
            p.course._id === courseId && p.status === 'pending'
        );

        if (pendingPayment) {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const paymentDate = new Date(pendingPayment.createdAt);

            if (paymentDate < tenMinutesAgo) {
                // Payment is older than 10 minutes, check status
                const statusResult = await checkPendingPaymentStatus(pendingPayment.orderId);

                if (statusResult) {
                    if (statusResult.status === 'expired' || statusResult.status === 'failed') {
                        // Show option to start new payment
                        showPendingPaymentAlert(pendingPayment, true);
                    } else if (statusResult.status === 'verification_failed') {
                        // Contact support
                        showContactSupportAlert(pendingPayment.orderId);
                    } else if (statusResult.status === 'success') {
                        // Payment was successful, reload page
                        showToast('Payment verified successfully!', 'success');
                        setTimeout(() => location.reload(), 1500);
                    }
                }
            } else {
                // Payment is recent, show pending alert
                showPendingPaymentAlert(pendingPayment, false);
            }
        }

    } catch (error) {
        console.error('Error checking pending payment:', error);
    }
}

// Show pending payment alert with options
function showPendingPaymentAlert(payment, canRetry) {
    const message = canRetry 
        ? `You have an expired payment for this course. Would you like to start a new payment?`
        : `You have a pending payment for this course. Please complete or cancel it first.`;

    const alertHTML = `
        <div id="pending-payment-alert" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
        ">
            <h4 style="margin-top: 0;">⏳ Pending Payment</h4>
            <p>${message}</p>
            <p><strong>Order ID:</strong> ${payment.orderId}</p>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                ${canRetry ? `
                    <button onclick="handleCancelAndRetry('${payment.orderId}')" style="
                        flex: 1;
                        padding: 10px;
                        background: #2c68ff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Start New Payment</button>
                ` : `
                    <button onclick="cancelPendingPayment('${payment.orderId}')" style="
                        flex: 1;
                        padding: 10px;
                        background: #ff4444;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Cancel Payment</button>
                `}
                <button onclick="document.getElementById('pending-payment-alert').remove()" style="
                    flex: 1;
                    padding: 10px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Close</button>
            </div>
        </div>
    `;

    // Remove existing alert if any
    const existingAlert = document.getElementById('pending-payment-alert');
    if (existingAlert) existingAlert.remove();

    document.body.insertAdjacentHTML('beforeend', alertHTML);
}

// Show contact support alert
function showContactSupportAlert(orderId) {
    const alertHTML = `
        <div id="support-alert" style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
        ">
            <h4 style="margin-top: 0; color: #ff9800;">⚠️ Payment Verification Failed</h4>
            <p>Your payment was processed but verification failed. Please contact support with your Order ID.</p>
            <p><strong>Order ID:</strong> <span id="order-id-copy">${orderId}</span></p>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button onclick="copyOrderId('${orderId}')" style="
                    flex: 1;
                    padding: 10px;
                    background: #2c68ff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Copy Order ID</button>
                <button onclick="document.getElementById('support-alert').remove()" style="
                    flex: 1;
                    padding: 10px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">Close</button>
            </div>
        </div>
    `;

    const existingAlert = document.getElementById('support-alert');
    if (existingAlert) existingAlert.remove();

    document.body.insertAdjacentHTML('beforeend', alertHTML);
}

// Copy order ID to clipboard
function copyOrderId(orderId) {
    navigator.clipboard.writeText(orderId).then(() => {
        showToast('Order ID copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy Order ID', 'error');
    });
}

// Handle cancel and retry
async function handleCancelAndRetry(orderId) {
    const cancelled = await cancelPendingPayment(orderId);
    if (cancelled) {
        document.getElementById('pending-payment-alert')?.remove();
        // Trigger enrollment button click after short delay
        setTimeout(() => {
            const enrollBtn = document.querySelector('[onclick*="handleCourseEnrollment"]');
            if (enrollBtn) enrollBtn.click();
        }, 500);
    }
}

// Display payment history on profile page
function displayPaymentHistory(payments) {
    const container = document.getElementById('paymentHistoryContainer');
    
    if (!container) return;

    if (!payments || payments.length === 0) {
        container.innerHTML = '<p>No payment history available.</p>';
        return;
    }

    container.innerHTML = payments.map(payment => `
        <div class="payment-card ${payment.status}">
            <div class="payment-header">
                <h4>${payment.course.title}</h4>
                <span class="payment-status ${payment.status}">${payment.status.toUpperCase()}</span>
            </div>
            <div class="payment-details">
                <p><strong>Amount:</strong> ₹${payment.amount}</p>
                <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleDateString()}</p>
                <p><strong>Order ID:</strong> ${payment.orderId}</p>
                ${payment.paymentId ? `<p><strong>Payment ID:</strong> ${payment.paymentId}</p>` : ''}
                ${payment.status === 'pending' ? `
                    <button onclick="checkPendingPaymentStatus('${payment.orderId}')" style="
                        margin-top: 10px;
                        padding: 8px 15px;
                        background: #2c68ff;
                        color: white;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                    ">Check Status</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}
