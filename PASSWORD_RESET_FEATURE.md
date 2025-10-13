# Password Reset Feature Documentation

## Overview
OTP-based password reset functionality has been implemented following the same security pattern as the registration flow.

## Implementation Details

### Backend Changes

#### 1. Controller Methods (`server/controllers/authController.js`)
Added two new controller functions:

- **`sendPasswordResetOTP`** - Sends OTP to registered email
  - Validates user exists before sending OTP
  - Generates 6-digit OTP and stores in memory
  - Sends email with password reset subject line

- **`resetPassword`** - Resets password after OTP verification
  - Validates OTP (checks existence, expiry, and correctness)
  - Updates user password (auto-hashed by Mongoose middleware)
  - Clears OTP after successful reset

#### 2. Email Utility Enhancement (`server/utils/sendEmail.js`)
Updated to support different email types:
- Added optional `type` parameter (default: 'Verification', or 'Password Reset')
- Different subject lines and message content based on type
- Includes security warning for password reset emails

#### 3. API Routes (`server/server.js`)
Added two new endpoints:
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP verification

### Frontend Changes

#### 1. New Page (`client/forgot-password.html`)
Two-step password reset interface:

**Step 1: Request OTP**
- Email input field
- "Send Reset Code" button
- Link back to login page

**Step 2: Reset Password**
- OTP input (6-digit)
- New password field with show/hide toggle
- Confirm password field with show/hide toggle
- Submit button
- Link to request new code

#### 2. Client-Side Functions (`client/script.js`)
Added three new functions:

- **`requestPasswordResetOTP(event)`** - Requests OTP for password reset
  - Validates email format
  - Calls `/api/auth/forgot-password`
  - Transitions to Step 2 on success

- **`resetPassword(event)`** - Completes password reset
  - Validates OTP length (6 digits)
  - Validates new password length (min 6 characters)
  - Validates password confirmation matches
  - Calls `/api/auth/reset-password`
  - Redirects to login on success

- **`togglePasswordField(fieldId, button)`** - Toggles password visibility
  - Works with specific field IDs
  - Updates button text (Show/Hide)

- **`showRequestOtpForm()`** - Returns to Step 1
  - Clears form fields
  - Resets error messages

#### 3. Login Page Update (`client/login.html`)
Changed "Forgot Password?" link from `#` to `forgot-password.html`

## User Flow

1. User clicks "Forgot Password?" on login page
2. User enters registered email address
3. System validates email exists in database
4. System sends 6-digit OTP to email (expires in 10 minutes)
5. User enters OTP, new password, and confirms password
6. System validates OTP and password requirements
7. System updates password (auto-hashed)
8. System clears OTP and redirects to login
9. User can now login with new password

## Security Features

- ✅ OTP expires after 10 minutes
- ✅ OTP is cleared after successful use
- ✅ Only registered emails can request password reset
- ✅ Password requirements enforced (min 6 characters)
- ✅ Password confirmation validation
- ✅ Passwords auto-hashed by Mongoose middleware
- ✅ Email includes warning if user didn't request reset

## Testing Checklist

### Manual Testing Steps:

1. **Happy Path Test**
   - [ ] Navigate to forgot-password.html
   - [ ] Enter registered email
   - [ ] Check email inbox/spam for OTP
   - [ ] Enter valid OTP and new password
   - [ ] Confirm password reset successful
   - [ ] Login with new password

2. **Validation Tests**
   - [ ] Try invalid email format → Should show error
   - [ ] Try unregistered email → Should show "No account found"
   - [ ] Try invalid OTP → Should show "Invalid OTP"
   - [ ] Try expired OTP (wait 11 minutes) → Should show "OTP expired"
   - [ ] Try mismatched passwords → Should show "Passwords do not match"
   - [ ] Try password < 6 characters → Should show length error

3. **Edge Cases**
   - [ ] Request new OTP multiple times → Latest OTP should work
   - [ ] Click "Request new code" link → Should return to Step 1
   - [ ] Toggle password visibility → Should work for both fields
   - [ ] Server restart during reset → OTP lost (in-memory storage limitation)

## API Endpoints

### POST /api/auth/forgot-password
**Request:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset OTP sent to your email"
}
```

**Error Response (404):**
```json
{
  "message": "No account found with this email"
}
```

### POST /api/auth/reset-password
**Request:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- 400: "No OTP found. Please request a new one."
- 400: "OTP expired. Please request a new one."
- 400: "Invalid OTP"
- 404: "User not found"

## Known Limitations

1. **In-Memory OTP Storage**: OTPs are stored in-memory and will be lost on server restart. For production, implement Redis-based storage.

2. **No Rate Limiting**: Users can request unlimited OTPs. Consider implementing rate limiting to prevent abuse.

3. **No Email Verification History**: System doesn't track reset attempts. Consider logging for security auditing.

## Future Enhancements

- [ ] Add rate limiting for OTP requests
- [ ] Implement Redis for OTP storage
- [ ] Add email notification when password is changed
- [ ] Track and log password reset attempts
- [ ] Add CAPTCHA to prevent bot abuse
- [ ] Implement password strength meter
- [ ] Add "Recently used passwords" check

## Files Modified

### Backend
- `server/controllers/authController.js` - Added password reset controllers
- `server/utils/sendEmail.js` - Enhanced to support different email types
- `server/server.js` - Added new API routes

### Frontend
- `client/forgot-password.html` - New password reset page
- `client/script.js` - Added password reset functions
- `client/login.html` - Updated forgot password link

## Environment Variables
No new environment variables required. Uses existing:
- `EMAIL_USER` - Gmail account for sending emails
- `EMAIL_PASS` - Gmail app password
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Not used in this feature, but needed for auth system
