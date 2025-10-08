// Add these functions at the top of the file
function checkAuthStatus() {
    const token = localStorage.getItem('userToken');
    const userName = localStorage.getItem('userName');
    const userType = localStorage.getItem('userType');

    const loggedOutNav = document.getElementById('logged-out-nav');
    const loggedInNav = document.getElementById('logged-in-nav');
    const userNameSpan = document.getElementById('user-name');

    if (token && userName) {
        loggedOutNav.style.display = 'none';
        loggedInNav.style.display = 'flex';
        userNameSpan.textContent = `Welcome, ${userName}`;
    } else {
        loggedOutNav.style.display = 'flex';
        loggedInNav.style.display = 'none';
    }
}

function handleLogout() {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userType');
    window.location.href = 'login.html';
}

// Smooth Scrolling
document.addEventListener('DOMContentLoaded', function() {
    // Handle smooth scrolling for all anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
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
const API_URL = 'http://localhost:5000/api';

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
        showError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Password validation
    if (password.length < 6) {
        showError('password', 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    if (isValid) {
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
                // Store the token
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userType', data.userType);

                showSuccess('Login successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showError('email', data.message);
            }
        } catch (error) {
            showError('email', 'Server error. Please try again later.');
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
        showError('name', 'Name must be at least 2 characters long');
        isValid = false;
    }
    
    // Email validation
    if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address');
        isValid = false;
    }
    
    // Mobile validation
    if (!isValidMobile(mobile)) {
        showError('mobile', 'Please enter a valid 10-digit mobile number');
        isValid = false;
    }
    
    // DOB validation
    if (!isValidAge(dob)) {
        showError('dob', 'You must be at least 13 years old to register');
        isValid = false;
    }

    // Password validation
    if (password && password.length < 6) {
        showError('password', 'Password must be at least 6 characters long');
        isValid = false;
    }

    // OTP validation
    if (!otp || otp.length !== 6) {
        showError('OTP', 'Please enter the 6-digit OTP sent to your email');
        isValid = false;
    }
    
    if (isValid) {
        // Verify OTP first
        try {
            const otpRes = await fetch(`${API_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const otpData = await otpRes.json();
            if (!otpRes.ok || !otpData.verified) {
                showError('OTP', otpData.message || 'OTP verification failed');
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
                // Store the token
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('userName', data.name);
                localStorage.setItem('userType', data.userType);

                showSuccess('Sign up successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showError('email', data.message);
            }
        } catch (error) {
            showError('email', 'Server error. Please try again later.');
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
    clearErrors();
    if (!isValidEmail(email)) {
        showError('email', 'Please enter a valid email address first');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('otpsection').style.display = 'block';
            showSuccess('OTP has been sent to your email address');
        } else {
            showError('email', data.message);
        }
    } catch (error) {
        showError('email', 'Failed to send OTP. Please try again later.');
    }
}