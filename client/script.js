// Add these functions at the top of the file
function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    const userType = localStorage.getItem('userType');

    const loggedOutNav = document.getElementById('logged-out-nav');
    const loggedInNav = document.getElementById('logged-in-nav');
    const userNameSpan = document.getElementById('user-name');
    const dashboardLink = document.getElementById('dashboard-link');

    if (token && userName) {
        if (loggedOutNav) loggedOutNav.style.display = 'none';
        if (loggedInNav) loggedInNav.style.display = 'flex';
        if (userNameSpan) userNameSpan.textContent = `Welcome, ${userName}`;
        
        // Set dashboard link based on user type
        if (dashboardLink) {
            dashboardLink.style.display = 'block';
            if (userType === 'teacher') {
                dashboardLink.href = 'teacher-dashboard.html';
                dashboardLink.textContent = 'Dashboard';
            } else {
                dashboardLink.href = 'my-courses.html';
                dashboardLink.textContent = 'My Courses';
            }
        }
        
        // For profile page - show Dashboard for teachers instead of My Courses
        const profileMyCourses = document.getElementById('profile-my-courses-link');
        if (profileMyCourses && userType === 'teacher') {
            profileMyCourses.href = 'teacher-dashboard.html';
            profileMyCourses.textContent = 'Dashboard';
        }
        
        // For courses page - show Dashboard for teachers instead of My Courses
        const coursesPageMyCourses = document.getElementById('courses-page-my-courses-link');
        if (coursesPageMyCourses && userType === 'teacher') {
            coursesPageMyCourses.href = 'teacher-dashboard.html';
            coursesPageMyCourses.textContent = 'Dashboard';
        }
    } else {
        if (loggedOutNav) loggedOutNav.style.display = 'flex';
        if (loggedInNav) loggedInNav.style.display = 'none';
        if (dashboardLink) dashboardLink.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

// Toggle user dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const usernameBtn = document.getElementById('user-name');
    
    dropdown.classList.toggle('show');
    usernameBtn.classList.toggle('active');
}

// Close user dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('user-dropdown');
    const usernameBtn = document.getElementById('user-name');
    
    if (userMenu && !userMenu.contains(event.target)) {
        if (dropdown) dropdown.classList.remove('show');
        if (usernameBtn) usernameBtn.classList.remove('active');
    }
});

// Smooth Scrolling
document.addEventListener('DOMContentLoaded', function() {
    // Handle smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            // Skip if href is just "#" or empty (placeholder links)
            if (!targetId || targetId === '#' || targetId.length <= 1) {
                return;
            }
            
            e.preventDefault();
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact Form Handling
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect form data
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            
            // Simulate form submission
            console.log('Sending inquiry:', data);
            showSuccessMessage(contactForm, 'Thank you for your interest! We\'ll contact you soon.');
            
            // Reset form
            contactForm.reset();
        });
    }

    checkAuthStatus(); // Add this line
});

function showSuccessMessage(form, message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    form.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// API endpoints
const API_URL = 'https://ed-tech-web-app-79a4.onrender.com/api' || 'http://localhost:5000/api';

// Form validation for Login
async function validateLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    let isValid = true;
    
    // Clear previous errors
    clearErrors();
    
    // Email validation
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        isValid = false;
    }
    
    // Password validation
    if (password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        isValid = false;
    }
    
    if (isValid) {
        // Show loading state
        const loginBtn = document.querySelector('button[type="submit"]');
        const originalText = loginBtn.textContent;
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the token and user info
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userType', data.userType);
                localStorage.setItem('userId', data._id);

                showToast('🎉 Login successful! Redirecting to your dashboard...', 'success');
                setTimeout(() => {
                    // Redirect based on user type
                    if (data.userType === 'teacher') {
                        window.location.href = 'teacher-dashboard.html';
                    } else {
                        window.location.href = 'courses.html';
                    }
                }, 2000);
            } else {
                showToast(data.message || 'Login failed. Please check your credentials.', 'error');
                loginBtn.disabled = false;
                loginBtn.textContent = originalText;
            }
        } catch (error) {
            showToast('Server error. Please check your connection and try again.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    }
    
    return false;
}

// Form validation for Signup
async function validateSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const mobile = document.getElementById('mobile').value;
    const dob = document.getElementById('dob').value;
    const userType = document.getElementById('userType').value;
    const password = document.getElementById('password').value;
    const otp = document.getElementById('OTP').value;
    let isValid = true;
    
    // Clear previous errors
    clearErrors();
    
    // Name validation
    if (name.length < 2) {
        showToast('Name must be at least 2 characters long', 'error');
        isValid = false;
    }
    
    // Email validation
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        isValid = false;
    }
    
    // Mobile validation
    if (!isValidMobile(mobile)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        isValid = false;
    }
    
    // DOB validation
    if (!isValidAge(dob)) {
        showToast('You must be at least 13 years old to register', 'error');
        isValid = false;
    }

    // Password validation
    if (password && password.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        isValid = false;
    }

    // OTP validation
    if (!otp || otp.length !== 6) {
        showToast('Please enter the 6-digit OTP sent to your email', 'error');
        isValid = false;
    }
    
    if (isValid) {
        // Show loading state
        const submitBtn = document.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
        
        // Verify OTP first
        try {
            const otpRes = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const otpData = await otpRes.json();
            
            if (!otpRes.ok || !otpData.verified) {
                showToast(otpData.message || 'Invalid OTP. Please check and try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return false;
            }
            
            // Proceed with registration
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    mobile,
                    dob,
                    userType
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store the token and user info
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userType', data.userType);
                localStorage.setItem('userId', data._id);

                showToast('🎉 Sign up successful! Redirecting to your dashboard...', 'success');
                setTimeout(() => {
                    // Redirect based on user type
                    if (data.userType === 'teacher') {
                        window.location.href = 'teacher-dashboard.html';
                    } else {
                        window.location.href = 'courses.html';
                    }
                }, 2000);
            } else {
                showToast(data.message || 'Registration failed. Please try again.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            showToast('Server error. Please check your connection and try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
    
    return false;
}

// Helper functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidMobile(mobile) {
    return /^[0-9]{10}$/.test(mobile);
}

function isValidAge(dob) {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const month = today.getMonth() - birthDate.getMonth();
    
    if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age >= 13;
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
    field.classList.add('error');
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.querySelector('form').appendChild(successDiv);
}

function clearErrors() {
    const errors = document.querySelectorAll('.error-message');
    const successes = document.querySelectorAll('.success-message');
    const fields = document.querySelectorAll('.error');
    
    errors.forEach(error => error.remove());
    successes.forEach(success => success.remove());
    fields.forEach(field => field.classList.remove('error'));
}

// Password visibility toggle
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleBtn.textContent = 'Hide';
    } else {
        passwordField.type = 'password';
        toggleBtn.textContent = 'Show';
    }
}

// OTP functionality
async function showotp() {
    const email = document.getElementById('email').value;
    const otpButton = document.querySelector('.otp-button');
    
    clearErrors();
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address first', 'error');
        return;
    }
    
    // Disable button and show loading state
    otpButton.disabled = true;
    otpButton.textContent = 'Sending...';
    
    try {
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('otpsection').style.display = 'block';
            showToast('✅ OTP has been sent to your email address. Please check your inbox!', 'success');
            otpButton.textContent = 'OTP Sent ✓';
            setTimeout(() => {
                otpButton.textContent = 'Resend OTP';
                otpButton.disabled = false;
            }, 30000); // Enable resend after 30 seconds
        } else {
            showToast(data.message || 'Failed to send OTP', 'error');
            otpButton.disabled = false;
            otpButton.textContent = 'Get OTP';
        }
    } catch (error) {
        showToast('Failed to send OTP. Please check your internet connection and try again.', 'error');
        otpButton.disabled = false;
        otpButton.textContent = 'Get OTP';
    }
}

// Password Reset functionality

// Request password reset OTP
async function requestPasswordResetOTP(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    clearErrors();
    
    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
    }
    
    // Show loading state
    const requestBtn = event.target.querySelector('button[type="submit"]');
    const originalText = requestBtn.textContent;
    requestBtn.disabled = true;
    requestBtn.textContent = 'Sending OTP...';
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('✉️ ' + (data.message || 'OTP sent successfully! Check your email.'), 'success');
            // Hide request form and show reset form
            setTimeout(() => {
                document.getElementById('requestOtpForm').style.display = 'none';
                document.getElementById('resetPasswordForm').style.display = 'block';
            }, 1500);
        } else {
            showToast(data.message || 'Failed to send OTP. Please try again.', 'error');
            requestBtn.disabled = false;
            requestBtn.textContent = originalText;
        }
    } catch (error) {
        showToast('Server error. Please check your connection and try again.', 'error');
        requestBtn.disabled = false;
        requestBtn.textContent = originalText;
    }
    
    return false;
}

// Reset password with OTP
async function resetPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const otp = document.getElementById('otp').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    clearErrors();
    let isValid = true;
    
    // OTP validation
    if (!otp || otp.trim().length !== 6 || !/^\d{6}$/.test(otp)) {
        showToast('Please enter a valid 6-digit OTP sent to your email', 'error');
        isValid = false;
    }
    
    // Password validation
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        isValid = false;
    }
    
    // Confirm password validation
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match. Please try again.', 'error');
        isValid = false;
    }
    
    if (!isValid) {
        return false;
    }
    
    // Show loading state
    const resetBtn = event.target.querySelector('button[type="submit"]');
    const originalText = resetBtn.textContent;
    resetBtn.disabled = true;
    resetBtn.textContent = 'Resetting password...';
    
    try {
        const response = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('🔐 Password reset successful! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast(data.message || 'Password reset failed. Please check your OTP.', 'error');
            resetBtn.disabled = false;
            resetBtn.textContent = originalText;
        }
    } catch (error) {
        showToast('Server error. Please check your connection and try again.', 'error');
        resetBtn.disabled = false;
        resetBtn.textContent = originalText;
    }
    
    return false;
}

// Show request OTP form again
function showRequestOtpForm() {
    clearErrors();
    document.getElementById('resetPasswordForm').style.display = 'none';
    document.getElementById('requestOtpForm').style.display = 'block';
    document.getElementById('otp').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

// Toggle password visibility for specific field
function togglePasswordField(fieldId, button) {
    const field = document.getElementById(fieldId);
    if (field.type === 'password') {
        field.type = 'text';
        button.textContent = 'Hide';
    } else {
        field.type = 'password';
        button.textContent = 'Show';
    }
}

// ============================================
// COURSE MANAGEMENT FUNCTIONS
// ============================================

// Get auth headers for protected routes
function getAuthHeaders() {
    const token = localStorage.getItem('userToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ========== TEACHER DASHBOARD ==========

// Load teacher dashboard
async function loadTeacherDashboard() {
    try {
        const response = await fetch(`${API_URL}/courses/my/created`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayTeacherCourses(data.courses);
            updateDashboardStats(data.courses);
        } else {
            showError('myCoursesList', data.message || 'Failed to load courses');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('myCoursesList', 'Failed to load dashboard');
    }
}

function displayTeacherCourses(courses) {
    const container = document.getElementById('myCoursesList');
    
    if (!courses || courses.length === 0) {
        container.innerHTML = '<p class="empty-message">You haven\'t created any courses yet. Click "Create New Course" to get started!</p>';
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="course-card teacher-course-card">
            <img src="${course.thumbnail || 'https://img.icons8.com/clouds/200/000000/book.png'}" alt="${course.title}">
            <div class="course-card-content">
                <h3>${course.title}</h3>
                <p class="course-meta">
                    <span class="badge">${course.classLevel ? 'Class ' + course.classLevel : ''}</span>
                    <span class="badge">${course.category}</span>
                    <span class="badge">${course.difficulty}</span>
                </p>
                <p class="course-description">${course.description ? (course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description) : 'No description available'}</p>
                <div class="course-stats">
                    <span>📚 ${course.enrolledStudents?.length || 0} Students</span>
                    <span>⭐ ${course.rating || 0}</span>
                    <span>₹${course.price}</span>
                </div>
                
                <!-- Live Classes Section -->
                ${course.liveClasses && course.liveClasses.length > 0 ? `
                    <div class="live-classes-preview" id="liveClasses-${course._id}">
                        <!-- Live classes will be loaded here -->
                    </div>
                ` : ''}
                
                <div class="course-actions">
                    <button onclick="viewCourse('${course._id}')" class="btn-view">View</button>
                    <button onclick="openContentModal('${course._id}')" class="btn-content">📚 Content</button>
                    <button onclick="showScheduleLiveModal('${course._id}')" class="btn-live">🎥 Schedule Live</button>
                    <button onclick="editCourse('${course._id}')" class="btn-edit">Edit</button>
                    <button onclick="deleteCourseConfirm('${course._id}')" class="btn-delete">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
    
    // Load live classes for each course
    courses.forEach(course => {
        if (course.liveClasses && course.liveClasses.length > 0) {
            displayLiveClasses(course.liveClasses, course._id);
        }
    });
}

function updateDashboardStats(courses) {
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0);
    const avgRating = courses.length > 0 
        ? (courses.reduce((sum, course) => sum + (course.rating || 0), 0) / courses.length).toFixed(1)
        : '0.0';
    
    document.getElementById('totalCourses').textContent = totalCourses;
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('avgRating').textContent = avgRating;
}

// Create course modal functions
function showCreateCourseModal() {
    document.getElementById('createCourseModal').style.display = 'block';
}

function closeCreateCourseModal() {
    document.getElementById('createCourseModal').style.display = 'none';
    document.getElementById('createCourseForm').reset();
}

// Create course
async function createCourse(event) {
    event.preventDefault();
    
    const courseData = {
        title: document.getElementById('courseTitle').value,
        description: document.getElementById('courseDescription').value,
        category: document.getElementById('courseCategory').value,
        classLevel: document.getElementById('courseClass').value,
        subject: document.getElementById('courseSubject').value,
        difficulty: document.getElementById('courseDifficulty').value,
        price: Number(document.getElementById('coursePrice').value),
        duration: Number(document.getElementById('courseDuration').value) || 0,
        thumbnail: document.getElementById('courseThumbnail').value || undefined,
        requirements: document.getElementById('courseRequirements').value || undefined,
        whatYouWillLearn: document.getElementById('courseWhatYouLearn').value 
            ? document.getElementById('courseWhatYouLearn').value.split(',').map(item => item.trim())
            : [],
        tags: document.getElementById('courseTags').value 
            ? document.getElementById('courseTags').value.split(',').map(tag => tag.trim())
            : []
    };
    
    try {
        const response = await fetch(`${API_URL}/courses`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(courseData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Course created successfully!');
            closeCreateCourseModal();
            loadTeacherDashboard();
        } else {
            alert(data.message || 'Failed to create course');
        }
    } catch (error) {
        console.error('Error creating course:', error);
        alert('Failed to create course. Please try again.');
    }
    
    return false;
}

// Edit course functions
function closeEditCourseModal() {
    document.getElementById('editCourseModal').style.display = 'none';
}

async function editCourse(courseId) {
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            const course = data.course;
            document.getElementById('editCourseId').value = course._id;
            document.getElementById('editCourseTitle').value = course.title;
            document.getElementById('editCourseDescription').value = course.description;
            document.getElementById('editCoursePrice').value = course.price;
            document.getElementById('editCourseDuration').value = course.duration;
            
            document.getElementById('editCourseModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading course:', error);
        alert('Failed to load course details');
    }
}

async function updateCourse(event) {
    event.preventDefault();
    
    const courseId = document.getElementById('editCourseId').value;
    const updateData = {
        title: document.getElementById('editCourseTitle').value,
        description: document.getElementById('editCourseDescription').value,
        price: Number(document.getElementById('editCoursePrice').value),
        duration: Number(document.getElementById('editCourseDuration').value)
    };
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Course updated successfully!');
            closeEditCourseModal();
            loadTeacherDashboard();
        } else {
            alert(data.message || 'Failed to update course');
        }
    } catch (error) {
        console.error('Error updating course:', error);
        alert('Failed to update course');
    }
    
    return false;
}

// Delete course
async function deleteCourseConfirm(courseId) {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Course deleted successfully');
            loadTeacherDashboard();
        } else {
            alert(data.message || 'Failed to delete course');
        }
    } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course');
    }
}

// ========== COURSE CONTENT MANAGEMENT ==========

let currentCourseForContent = null;

// Open content management modal
async function openContentModal(courseId) {
    currentCourseForContent = courseId;
    document.getElementById('contentCourseId').value = courseId;
    
    // Load course details
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: getAuthHeaders()
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
            document.getElementById('contentCourseTitle').textContent = data.course.title;
            displayCourseContent(data.course.content || []);
        }
    } catch (error) {
        console.error('Error loading course:', error);
    }
    
    document.getElementById('contentModal').style.display = 'block';
}

// Close content modal
function closeContentModal() {
    document.getElementById('contentModal').style.display = 'none';
    document.getElementById('addContentForm').reset();
    currentCourseForContent = null;
}

// Display course content items
function displayCourseContent(contentItems) {
    const container = document.getElementById('courseContentList');
    const countSpan = document.getElementById('contentCount');
    
    countSpan.textContent = contentItems.length;
    
    if (contentItems.length === 0) {
        container.innerHTML = '<p class="empty-message">No content added yet. Use the form above to add videos, PDFs, or assignments.</p>';
        return;
    }
    
    // Sort by order
    const sortedContent = [...contentItems].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    container.innerHTML = sortedContent.map((item, index) => `
        <div class="content-item">
            <div class="content-item-header">
                <div class="content-item-info">
                    <span class="content-type-icon">${getContentIcon(item.type)}</span>
                    <div>
                        <h4>${item.title}</h4>
                        <p class="content-meta">
                            <span class="badge-small">${item.type}</span>
                            ${item.duration ? `<span>⏱️ ${item.duration} min</span>` : ''}
                            <span>Order: ${item.order !== undefined ? item.order : index}</span>
                        </p>
                    </div>
                </div>
                <button onclick="deleteContentItem('${item._id}')" class="btn-delete-small" title="Delete">🗑️</button>
            </div>
            ${item.description ? `<p class="content-description">${item.description}</p>` : ''}
            <p class="content-url"><a href="${item.url}" target="_blank">🔗 View Content</a></p>
        </div>
    `).join('');
}

// Get icon for content type
function getContentIcon(type) {
    const icons = {
        'video': '📹',
        'pdf': '📄',
        'assignment': '📝',
        'text': '📖'
    };
    return icons[type] || '📦';
}

// Add content to course
async function addCourseContentItem(event) {
    event.preventDefault();
    
    const courseId = document.getElementById('contentCourseId').value;
    const contentType = document.getElementById('contentType').value;
    let contentUrl = '';
    
    // Check if using file upload or URL
    if (currentUploadMethod === 'upload') {
        if (!selectedFile) {
            alert('Please select a file to upload');
            return;
        }
        
        try {
            // Upload file first
            const uploadResult = await uploadFileToServer(selectedFile, contentType);
            contentUrl = uploadResult.url;
            uploadedFileUrl = uploadResult.url;
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file. Please try again.');
            return;
        }
    } else {
        contentUrl = document.getElementById('contentUrl').value;
        if (!contentUrl) {
            alert('Please enter a URL');
            return;
        }
    }
    
    const contentData = {
        title: document.getElementById('contentTitle').value,
        type: contentType,
        url: contentUrl,
        description: document.getElementById('contentDescription').value || undefined,
        duration: Number(document.getElementById('contentDuration').value) || undefined,
        order: Number(document.getElementById('contentOrder').value) || undefined
    };
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/content`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(contentData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Content added successfully!');
            document.getElementById('addContentForm').reset();
            resetFileUpload();
            selectedFile = null;
            uploadedFileUrl = null;
            // Reload content list
            displayCourseContent(data.course.content || []);
        } else {
            alert(data.message || 'Failed to add content');
        }
    } catch (error) {
        console.error('Error adding content:', error);
        alert('Failed to add content');
    }
}

// Delete content item
async function deleteContentItem(contentId) {
    if (!confirm('Are you sure you want to delete this content item?')) {
        return;
    }
    
    const courseId = currentCourseForContent;
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/content/${contentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Content deleted successfully');
            displayCourseContent(data.course.content || []);
        } else {
            alert(data.message || 'Failed to delete content');
        }
    } catch (error) {
        console.error('Error deleting content:', error);
        alert('Failed to delete content');
    }
}

// ========== FILE UPLOAD FUNCTIONALITY ==========

let currentUploadMethod = 'url'; // 'url' or 'upload'
let selectedFile = null;
let uploadedFileUrl = null;

// Toggle between URL and file upload
function toggleUploadMethod(method) {
    currentUploadMethod = method;
    const urlToggle = document.getElementById('urlToggle');
    const uploadToggle = document.getElementById('uploadToggle');
    const urlInputGroup = document.getElementById('urlInputGroup');
    const fileUploadGroup = document.getElementById('fileUploadGroup');
    const contentUrl = document.getElementById('contentUrl');
    
    if (method === 'url') {
        urlToggle.classList.add('active');
        uploadToggle.classList.remove('active');
        urlInputGroup.style.display = 'block';
        fileUploadGroup.style.display = 'none';
        contentUrl.required = true;
        // Clear file upload
        selectedFile = null;
        uploadedFileUrl = null;
        resetFileUpload();
    } else {
        urlToggle.classList.remove('active');
        uploadToggle.classList.add('active');
        urlInputGroup.style.display = 'none';
        fileUploadGroup.style.display = 'block';
        contentUrl.required = false;
        contentUrl.value = '';
    }
}

// Handle content type change to update file accept attribute
function handleContentTypeChange() {
    const contentType = document.getElementById('contentType').value;
    const fileInput = document.getElementById('contentFile');
    const uploadHint = document.getElementById('uploadHint');
    
    let acceptTypes = '';
    let hintText = '';
    
    switch(contentType) {
        case 'video':
            acceptTypes = 'video/mp4,video/mov,video/avi,video/mkv,video/webm';
            hintText = 'Accepted: MP4, MOV, AVI, MKV, WEBM (Max 100MB)';
            break;
        case 'pdf':
            acceptTypes = 'application/pdf,.pdf';
            hintText = 'Accepted: PDF files (Max 10MB)';
            break;
        case 'assignment':
            acceptTypes = 'application/pdf,.pdf,.doc,.docx';
            hintText = 'Accepted: PDF, DOC, DOCX (Max 10MB)';
            break;
        case 'text':
            acceptTypes = 'application/pdf,.pdf';
            hintText = 'Accepted: PDF files (Max 10MB)';
            break;
        default:
            acceptTypes = '';
            hintText = 'Select content type first';
    }
    
    fileInput.accept = acceptTypes;
    uploadHint.textContent = hintText;
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const contentType = document.getElementById('contentType').value;
    if (!contentType) {
        alert('Please select content type first');
        event.target.value = '';
        return;
    }
    
    // Validate file size
    const maxSize = contentType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        alert(`File size exceeds ${maxSizeMB}MB limit`);
        event.target.value = '';
        return;
    }
    
    selectedFile = file;
    displayFilePreview(file);
}

// Display file preview
function displayFilePreview(file) {
    const placeholder = document.getElementById('uploadPlaceholder');
    const preview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileIcon = document.getElementById('fileIcon');
    
    const contentType = document.getElementById('contentType').value;
    const icons = {
        'video': '📹',
        'pdf': '📄',
        'assignment': '📝',
        'text': '📖'
    };
    
    fileIcon.textContent = icons[contentType] || '📄';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    placeholder.style.display = 'none';
    preview.style.display = 'flex';
}

// Remove selected file
function removeSelectedFile(event) {
    event.stopPropagation();
    selectedFile = null;
    uploadedFileUrl = null;
    resetFileUpload();
}

// Reset file upload UI
function resetFileUpload() {
    const fileInput = document.getElementById('contentFile');
    const placeholder = document.getElementById('uploadPlaceholder');
    const preview = document.getElementById('filePreview');
    const progress = document.getElementById('uploadProgress');
    
    if (fileInput) fileInput.value = '';
    if (placeholder) placeholder.style.display = 'block';
    if (preview) preview.style.display = 'none';
    if (progress) progress.style.display = 'none';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Upload file to server
async function uploadFileToServer(file, contentType) {
    const uploadProgress = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    uploadProgress.style.display = 'block';
    
    // Determine upload endpoint based on content type
    let endpoint = '';
    if (contentType === 'video') {
        endpoint = `${API_URL}/upload/video`;
    } else {
        endpoint = `${API_URL}/upload/document`;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });
        
        // Handle completion
        return new Promise((resolve, reject) => {
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    uploadProgress.style.display = 'none';
                    resolve(data);
                } else {
                    uploadProgress.style.display = 'none';
                    reject(new Error('Upload failed'));
                }
            });
            
            xhr.addEventListener('error', () => {
                uploadProgress.style.display = 'none';
                reject(new Error('Upload failed'));
            });
            
            xhr.open('POST', endpoint);
            xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('userToken'));
            xhr.send(formData);
        });
    } catch (error) {
        uploadProgress.style.display = 'none';
        throw error;
    }
}

// ========== BROWSE COURSES (PUBLIC) ==========

let allCourses = [];

async function loadAllCourses() {
    try {
        const response = await fetch(`${API_URL}/courses`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            allCourses = data.courses;
            displayCourses(allCourses);
        } else {
            document.getElementById('coursesList').innerHTML = '<p class="error-message">Failed to load courses</p>';
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('coursesList').innerHTML = '<p class="error-message">Failed to load courses</p>';
    }
}

function displayCourses(courses) {
    const container = document.getElementById('coursesList');
    const countElement = document.getElementById('coursesCount');
    
    if (!courses || courses.length === 0) {
        container.innerHTML = '<p class="empty-message">No courses found. Try adjusting your filters.</p>';
        countElement.textContent = 'No courses found';
        return;
    }
    
    countElement.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''} found`;
    
    container.innerHTML = courses.map(course => `
        <div class="course-card">
            <img src="${course.thumbnail || 'https://img.icons8.com/clouds/200/000000/book.png'}" alt="${course.title}">
            <div class="course-card-content">
                <h3>${course.title}</h3>
                <p class="course-meta">
                    <span class="badge">Class ${course.classLevel}</span>
                    <span class="badge">${course.category}</span>
                    <span class="badge">${course.difficulty}</span>
                </p>
                <p class="course-description">${course.description ? (course.description.length > 120 ? course.description.substring(0, 120) + '...' : course.description) : 'No description available'}</p>
                <p class="course-teacher">By ${course.teacher?.name || 'Unknown'}</p>
                <div class="course-footer">
                    <span class="course-price">${course.price === 0 ? 'Free' : '₹' + course.price}</span>
                    <span class="course-rating">⭐ ${course.rating || 0}</span>
                </div>
                <button onclick="viewCourseDetail('${course._id}')" class="cta-primary">View Details</button>
            </div>
        </div>
    `).join('');
}

function filterCourses() {
    const classLevel = document.getElementById('filterClass')?.value;
    const category = document.getElementById('filterCategory')?.value;
    const difficulty = document.getElementById('filterDifficulty')?.value;
    const priceFilter = document.getElementById('filterPrice')?.value;
    const searchTerm = document.getElementById('searchCourses')?.value.toLowerCase();
    
    let filtered = allCourses;
    
    if (classLevel) {
        filtered = filtered.filter(course => course.classLevel === classLevel);
    }
    
    if (category) {
        filtered = filtered.filter(course => course.category === category);
    }
    
    if (difficulty) {
        filtered = filtered.filter(course => course.difficulty === difficulty);
    }
    
    if (priceFilter === 'free') {
        filtered = filtered.filter(course => course.price === 0);
    } else if (priceFilter === 'paid') {
        filtered = filtered.filter(course => course.price > 0);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(course => 
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm) ||
            course.category.toLowerCase().includes(searchTerm)
        );
    }
    
    displayCourses(filtered);
}

function clearFilters() {
    document.getElementById('filterClass').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDifficulty').value = '';
    document.getElementById('filterPrice').value = '';
    document.getElementById('searchCourses').value = '';
    displayCourses(allCourses);
}

function viewCourseDetail(courseId) {
    window.location.href = `course-detail.html?id=${courseId}`;
}

function viewCourse(courseId) {
    window.location.href = `course-detail.html?id=${courseId}`;
}

// ========== COURSE DETAIL PAGE ==========

async function loadCourseDetail(courseId) {
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayCourseDetail(data.course);
        } else {
            document.getElementById('courseDetailContent').innerHTML = '<p class="error-message">Course not found</p>';
        }
    } catch (error) {
        console.error('Error loading course detail:', error);
        document.getElementById('courseDetailContent').innerHTML = '<p class="error-message">Failed to load course</p>';
    }
}

function displayCourseDetail(course) {
    const token = localStorage.getItem('userToken');
    const userType = localStorage.getItem('userType');
    const isEnrolled = course.enrolledStudents?.some(student => student._id === localStorage.getItem('userId'));
    
    const enrollButton = !token 
        ? '<a href="login.html" class="cta-primary">Login to Enroll</a>'
        : userType === 'teacher'
        ? '<p class="info-message">Teachers cannot enroll in courses</p>'
        : isEnrolled
        ? '<button class="btn-enrolled" disabled>Already Enrolled</button>'
        : `<button onclick="enrollInCourseNow('${course._id}')" class="cta-primary">Enroll Now</button>`;
    
    const content = `
        <div class="course-detail-header">
            <div class="course-detail-info">
                <h1>${course.title}</h1>
                <p class="course-teacher">By ${course.teacher?.name || 'Unknown'}</p>
                <p class="course-meta">
                    <span class="badge">Class ${course.classLevel}</span>
                    <span class="badge">${course.category}</span>
                    <span class="badge">${course.difficulty}</span>
                </p>
                <div class="course-stats-row">
                    <span>⭐ ${course.rating || 0} Rating</span>
                    <span>👥 ${course.enrolledStudents?.length || 0} Students</span>
                    <span>⏱️ ${course.duration || 0} hours</span>
                </div>
                <div class="course-price-section">
                    <span class="course-price-large">${course.price === 0 ? 'Free' : '₹' + course.price}</span>
                    ${enrollButton}
                </div>
            </div>
            <div class="course-detail-thumbnail">
                <img src="${course.thumbnail || 'https://img.icons8.com/clouds/400/000000/book.png'}" alt="${course.title}">
            </div>
        </div>
        
        <div class="course-detail-body">
            <div class="course-section">
                <h2>About This Course</h2>
                <p>${course.description}</p>
            </div>
            
            ${course.whatYouWillLearn && course.whatYouWillLearn.length > 0 ? `
            <div class="course-section">
                <h2>What You'll Learn</h2>
                <ul class="learning-list">
                    ${course.whatYouWillLearn.map(item => `<li>✓ ${item}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            ${course.requirements ? `
            <div class="course-section">
                <h2>Requirements</h2>
                <p>${course.requirements}</p>
            </div>
            ` : ''}
            
            ${course.content && course.content.length > 0 ? `
            <div class="course-section">
                <h2>Course Content</h2>
                <div class="course-content-list">
                    ${course.content.map((item, index) => `
                        <div class="content-item-student">
                            <div class="content-item-header">
                                <span class="content-type-icon">${getContentIcon(item.type)}</span>
                                <div class="content-info">
                                    <h4>${item.title}</h4>
                                    <p class="content-meta">
                                        <span class="badge-small">${item.type}</span>
                                        ${item.duration ? `<span>⏱️ ${item.duration} min</span>` : ''}
                                    </p>
                                    ${item.description ? `<p class="content-description">${item.description}</p>` : ''}
                                </div>
                            </div>
                            ${isEnrolled || userType === 'teacher' ? `
                                <div class="content-actions">
                                    <a href="${item.url}" target="_blank" class="btn-view-content">
                                        🔗 View Content
                                    </a>
                                    <a href="${item.url}" download class="btn-download-content">
                                        ⬇️ Download
                                    </a>
                                </div>
                            ` : `
                                <div class="content-locked">
                                    <span>🔒 Enroll to access this content</span>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : '<p class="info-message">Course content will be available soon</p>'}
            
            ${isEnrolled && course.liveClasses && course.liveClasses.length > 0 ? `
            <div class="course-section">
                <h2>🎥 Live Classes</h2>
                <div id="upcomingLiveClasses">
                    <!-- Live classes will be displayed here -->
                </div>
            </div>
            ` : ''}
            
            <div class="course-section">
                <h2>Teacher Information</h2>
                <div class="teacher-info">
                    <h3>${course.teacher?.name || 'Unknown'}</h3>
                    <p>Email: ${course.teacher?.email || 'N/A'}</p>
                    ${course.teacher?.mobile ? `<p>Mobile: ${course.teacher.mobile}</p>` : ''}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('courseDetailContent').innerHTML = content;
    
    // Display live classes if user is enrolled
    if (isEnrolled && course.liveClasses && course.liveClasses.length > 0) {
        displayUpcomingLiveClasses(course.liveClasses, course._id);
    }
}

async function enrollInCourseNow(courseId) {
    const token = localStorage.getItem('userToken');
    
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Successfully enrolled in course!');
            window.location.reload();
        } else {
            alert(data.message || 'Failed to enroll in course');
        }
    } catch (error) {
        console.error('Error enrolling in course:', error);
        alert('Failed to enroll in course');
    }
}

// ========== MY ENROLLED COURSES (STUDENT) ==========

async function loadEnrolledCourses() {
    try {
        const response = await fetch(`${API_URL}/courses/my/enrolled`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayEnrolledCourses(data.enrollments);
        } else {
            document.getElementById('enrolledCoursesList').innerHTML = '<p class="error-message">Failed to load courses</p>';
        }
    } catch (error) {
        console.error('Error loading enrolled courses:', error);
        document.getElementById('enrolledCoursesList').innerHTML = '<p class="error-message">Failed to load courses</p>';
    }
}

function displayEnrolledCourses(enrollments) {
    const container = document.getElementById('enrolledCoursesList');
    
    if (!enrollments || enrollments.length === 0) {
        container.innerHTML = '<p class="empty-message">You haven\'t enrolled in any courses yet. <a href="courses.html">Browse Courses</a></p>';
        return;
    }
    
    container.innerHTML = enrollments.map(enrollment => {
        const course = enrollment.course;
        return `
            <div class="course-card enrolled-course-card">
                <img src="${course.thumbnail || 'https://img.icons8.com/clouds/200/000000/book.png'}" alt="${course.title}">
                <div class="course-card-content">
                    <h3>${course.title}</h3>
                    <p class="course-meta">
                        <span class="badge">Class ${course.classLevel}</span>
                        <span class="badge">${course.category}</span>
                    </p>
                    <p class="course-teacher">By ${course.teacher?.name || 'Unknown'}</p>
                    <div class="progress-section">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${enrollment.progress}%"></div>
                        </div>
                        <span class="progress-text">${enrollment.progress}% Complete</span>
                    </div>
                    <p class="enrollment-date">Enrolled on ${new Date(enrollment.enrollmentDate).toLocaleDateString()}</p>
                    <button onclick="viewCourse('${course._id}')" class="cta-primary">Continue Learning</button>
                </div>
            </div>
        `;
    }).join('');
}

// ==========================
// NOTIFICATION SYSTEM
// ==========================

let notificationPollingInterval = null;

// Initialize notifications when user is logged in
async function initializeNotifications() {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    // Load unread count
    await loadUnreadCount();

    // Setup bell icon click handler
    const bellIcon = document.getElementById('notification-bell');
    if (bellIcon) {
        bellIcon.addEventListener('click', toggleNotificationDropdown);
    }

    // Setup mark all as read button
    const markAllBtn = document.getElementById('mark-all-read');
    if (markAllBtn) {
        markAllBtn.addEventListener('click', markAllNotificationsAsRead);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notification-dropdown');
        const bell = document.getElementById('notification-bell');
        
        if (dropdown && bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // Poll for new notifications every 30 seconds
    notificationPollingInterval = setInterval(loadUnreadCount, 30000);
}

// Load unread notification count
async function loadUnreadCount() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_URL}/notifications/unread-count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            const badge = document.getElementById('notification-count');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count > 99 ? '99+' : data.count;
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading unread count:', error);
    }
}

// Toggle notification dropdown
async function toggleNotificationDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notification-dropdown');
    const isVisible = dropdown.classList.contains('show');
    
    if (!isVisible) {
        // Load notifications
        await loadNotifications();
        dropdown.classList.add('show');
    } else {
        dropdown.classList.remove('show');
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_URL}/notifications?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            displayNotifications(data.notifications);
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display notifications in dropdown
function displayNotifications(notifications) {
    const listContainer = document.getElementById('notification-list');
    
    if (!listContainer) return;
    
    if (notifications.length === 0) {
        listContainer.innerHTML = `
            <div class="notification-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <p>No notifications yet</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = notifications.map(notif => {
        return `
            <div class="notification-item ${notif.isRead ? '' : 'unread'} type-${notif.type}" 
                 data-notification-id="${notif._id}"
                 data-action-url="${notif.actionUrl || ''}"
                 style="cursor: pointer;">
                <div class="notification-item-header">
                    <p class="notification-title">${notif.title}</p>
                    <span class="notification-time">${getRelativeTime(notif.createdAt)}</span>
                </div>
                <p class="notification-message">${notif.message}</p>
            </div>
        `;
    }).join('');
    
    // Add click event listeners to each notification
    const notificationItems = listContainer.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', function() {
            const notificationId = this.getAttribute('data-notification-id');
            const actionUrl = this.getAttribute('data-action-url');
            handleNotificationClick(notificationId, actionUrl);
        });
    });
}

// Handle notification click
async function handleNotificationClick(notificationId, actionUrl) {
    try {
        console.log('Notification clicked:', { notificationId, actionUrl });
        
        const token = localStorage.getItem('userToken');
        
        // Mark as read
        await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Update UI
        await loadUnreadCount();
        
        // Navigate if there's an action URL
        if (actionUrl && actionUrl.trim() !== '') {
            console.log('Navigating to:', actionUrl);
            window.location.href = actionUrl;
        } else {
            console.log('No action URL provided');
        }
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    try {
        const token = localStorage.getItem('userToken');
        
        const response = await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            await loadNotifications();
            await loadUnreadCount();
            showToast('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Error marking all as read:', error);
    }
}

// Get relative time (e.g., "5m ago", "2h ago")
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.notification-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Icon and title based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };
    
    const toast = document.createElement('div');
    toast.className = `notification-toast toast-${type}`;
    toast.innerHTML = `
        <div class="notification-toast-header">
            <span class="notification-toast-icon">${icons[type] || icons.info}</span>
            <span class="notification-toast-title">${titles[type] || titles.info}</span>
            <button class="notification-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-toast-message">${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Call initializeNotifications when auth status is checked
const originalCheckAuthStatus = checkAuthStatus;
checkAuthStatus = function() {
    originalCheckAuthStatus();
    const token = localStorage.getItem('userToken');
    if (token) {
        initializeNotifications();
    }
};

// ==================== LIVE CLASS MANAGEMENT ====================

// Schedule live class
async function scheduleLiveClass(courseId) {
    const title = document.getElementById('liveClassTitle').value.trim();
    const description = document.getElementById('liveClassDescription').value.trim();
    const scheduledFor = document.getElementById('liveClassDate').value;
    const duration = parseInt(document.getElementById('liveClassDuration').value) || 60;

    if (!title || !scheduledFor) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_URL}/courses/${courseId}/live-class`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                scheduledDate: new Date(scheduledFor).toISOString(),
                duration: duration
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Live class scheduled successfully!', 'success');
            closeScheduleLiveModal();
            loadCourseLiveClasses(courseId); // Refresh live classes list
        } else {
            showToast(data.message || 'Failed to schedule live class', 'error');
        }
    } catch (error) {
        console.error('Error scheduling live class:', error);
        showToast('Failed to schedule live class', 'error');
    }
}

// Show schedule live class modal
function showScheduleLiveModal(courseId) {
    document.getElementById('scheduleLiveModal').style.display = 'block';
    document.getElementById('scheduleLiveModal').dataset.courseId = courseId;
    
    // Set minimum date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('liveClassDate').min = now.toISOString().slice(0, 16);
}

// Close schedule live modal
function closeScheduleLiveModal() {
    document.getElementById('scheduleLiveModal').style.display = 'none';
    document.getElementById('scheduleLiveForm').reset();
}

// Load live classes for a course (for teacher dashboard)
async function loadCourseLiveClasses(courseId) {
    try {
        const token = localStorage.getItem('userToken');
        const response = await fetch(`${API_URL}/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.course.liveClasses) {
            displayLiveClasses(data.course.liveClasses, courseId);
        }
    } catch (error) {
        console.error('Error loading live classes:', error);
    }
}

// Display live classes in teacher dashboard
function displayLiveClasses(liveClasses, courseId) {
    const container = document.getElementById(`liveClasses-${courseId}`);
    if (!container) return;

    if (!liveClasses || liveClasses.length === 0) {
        container.innerHTML = '<p class="no-live-classes">No live classes scheduled yet.</p>';
        return;
    }

    container.innerHTML = liveClasses.map(liveClass => {
        const scheduledDate = new Date(liveClass.scheduledFor);
        const isPast = scheduledDate < new Date();
        const isLive = liveClass.isLive;
        const isCompleted = liveClass.isCompleted;
        const hasRecording = liveClass.recordingUrl;
        
        // Format date or show "Date not set" if invalid
        const dateDisplay = isNaN(scheduledDate.getTime()) 
            ? '📅 Date not set' 
            : `📅 ${scheduledDate.toLocaleString('en-US', { 
                dateStyle: 'medium', 
                timeStyle: 'short' 
            })}`;
        
        return `
            <div class="live-class-item ${isLive ? 'live' : isPast || isCompleted ? 'past' : 'upcoming'}">
                <div class="live-class-header">
                    <h4>${liveClass.title}</h4>
                    ${isLive ? '<span class="badge badge-live">🔴 LIVE</span>' : 
                      isCompleted ? '<span class="badge badge-past">✓ Completed</span>' :
                      isPast ? '<span class="badge badge-past">Ended</span>' : 
                      '<span class="badge badge-upcoming">Upcoming</span>'}
                </div>
                <p class="live-class-date">
                    ${dateDisplay}
                </p>
                <p class="live-class-description">${liveClass.description || 'No description'}</p>
                
                ${!isPast && !isLive && !isCompleted ? `
                    <button onclick="startLiveStream('${courseId}', '${liveClass._id}')" class="btn-start-stream">
                        Start Stream
                    </button>
                ` : ''}
                
                ${isLive ? `
                    <button onclick="goToLiveStream('${courseId}', '${liveClass._id}')" class="btn-go-live">
                        Go to Stream Room
                    </button>
                ` : ''}
                
                ${isCompleted && hasRecording ? `
                    <div class="recording-info">
                        <span class="recording-status">📹 Recording Available</span>
                        <a href="${liveClass.recordingUrl}" target="_blank" class="btn-view-recording">
                            View Recording
                        </a>
                        <button onclick="updateRecordingUrl('${courseId}', '${liveClass._id}', '${liveClass.recordingUrl}')" class="btn-update-recording">
                            Update URL
                        </button>
                    </div>
                ` : isCompleted && !hasRecording ? `
                    <button onclick="addRecordingUrl('${courseId}', '${liveClass._id}')" class="btn-add-recording">
                        📹 Add Recording URL
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Start live stream (redirects to teacher streaming page)
function startLiveStream(courseId, liveClassId) {
    window.location.href = `teacher-live-stream.html?courseId=${courseId}&liveClassId=${liveClassId}`;
}

// Go to existing live stream
function goToLiveStream(courseId, liveClassId) {
    window.location.href = `teacher-live-stream.html?courseId=${courseId}&liveClassId=${liveClassId}`;
}

// Add recording URL to completed live class
async function addRecordingUrl(courseId, liveClassId) {
    const recordingUrl = prompt('Enter the recording URL (YouTube, Google Drive, etc.):');
    
    if (!recordingUrl) {
        return; // User cancelled
    }

    // Basic URL validation
    if (!recordingUrl.startsWith('http://') && !recordingUrl.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/live-class/${liveClassId}/recording`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ recordingUrl })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(`Recording URL added successfully! ${data.notificationsSent} students notified.`);
            // Reload the course data to update the UI
            loadCreatedCourses();
        } else {
            alert(data.message || 'Failed to add recording URL');
        }
    } catch (error) {
        console.error('Error adding recording URL:', error);
        alert('Failed to add recording URL. Please try again.');
    }
}

// Update existing recording URL
async function updateRecordingUrl(courseId, liveClassId, currentUrl) {
    const newUrl = prompt('Update the recording URL:', currentUrl);
    
    if (!newUrl || newUrl === currentUrl) {
        return; // User cancelled or didn't change
    }

    // Basic URL validation
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/courses/${courseId}/live-class/${liveClassId}/recording`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ recordingUrl: newUrl })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert('Recording URL updated successfully!');
            // Reload the course data to update the UI
            loadCreatedCourses();
        } else {
            alert(data.message || 'Failed to update recording URL');
        }
    } catch (error) {
        console.error('Error updating recording URL:', error);
        alert('Failed to update recording URL. Please try again.');
    }
}

// Display upcoming live classes for students (course detail page)
function displayUpcomingLiveClasses(liveClasses, streamKey) {
    const container = document.getElementById('upcomingLiveClasses');
    if (!container) return;

    // Separate live/upcoming classes from completed classes with recordings
    const upcoming = liveClasses.filter(lc => {
        const scheduledDate = new Date(lc.scheduledFor);
        return scheduledDate > new Date() || lc.isLive;
    });

    const completed = liveClasses.filter(lc => 
        lc.isCompleted && lc.recordingUrl
    ).sort((a, b) => new Date(b.scheduledFor) - new Date(a.scheduledFor)); // Most recent first

    // Build HTML for upcoming classes
    let html = '';
    
    if (upcoming.length > 0) {
        html += '<div class="live-classes-section">';
        html += '<h3 class="section-title">🔴 Live & Upcoming Classes</h3>';
        html += upcoming.map(liveClass => {
            const scheduledDate = new Date(liveClass.scheduledFor);
            const isLive = liveClass.isLive;
            
            // Format date or show "Date not set" if invalid
            const dateDisplay = isNaN(scheduledDate.getTime()) 
                ? '📅 Date not set' 
                : `📅 ${scheduledDate.toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                })}`;
            
            return `
                <div class="live-class-item ${isLive ? 'live' : 'upcoming'}">
                    <div class="live-class-header">
                        <h4>${liveClass.title}</h4>
                        ${isLive ? '<span class="badge badge-live">🔴 LIVE NOW</span>' : 
                          '<span class="badge badge-upcoming">📅 Upcoming</span>'}
                    </div>
                    <p class="live-class-date">
                        ${dateDisplay}
                    </p>
                    <p class="live-class-description">${liveClass.description || 'No description'}</p>
                    ${isLive ? `
                        <button onclick="joinLiveStream('${liveClass.streamKey}')" class="btn-join-live">
                            🎥 Join Live Class
                        </button>
                    ` : ''}
                </div>
            `;
        }).join('');
        html += '</div>';
    }

    // Build HTML for recorded classes
    if (completed.length > 0) {
        html += '<div class="recorded-classes-section">';
        html += '<h3 class="section-title">📹 Class Recordings</h3>';
        html += '<p class="section-subtitle">Watch previous classes you may have missed</p>';
        html += completed.map(liveClass => {
            const scheduledDate = new Date(liveClass.scheduledFor);
            
            // Format date or show "Date not set" if invalid
            const dateDisplay = isNaN(scheduledDate.getTime()) 
                ? '📅 Date not set' 
                : `📅 ${scheduledDate.toLocaleString('en-US', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                })}`;
            
            return `
                <div class="live-class-item completed">
                    <div class="live-class-header">
                        <h4>${liveClass.title}</h4>
                        <span class="badge badge-recorded">✓ Recorded</span>
                    </div>
                    <p class="live-class-date">
                        ${dateDisplay}
                    </p>
                    <p class="live-class-description">${liveClass.description || 'No description'}</p>
                    <a href="${liveClass.recordingUrl}" target="_blank" class="btn-watch-recording">
                        ▶️ Watch Recording
                    </a>
                </div>
            `;
        }).join('');
        html += '</div>';
    }

    // Show message if no classes at all
    if (upcoming.length === 0 && completed.length === 0) {
        html = '<p class="no-live-classes">No live classes or recordings available yet.</p>';
    }

    container.innerHTML = html;
}

// Join live stream (for students)
function joinLiveStream(streamKey) {
    window.location.href = `live-stream.html?streamKey=${streamKey}`;
}

