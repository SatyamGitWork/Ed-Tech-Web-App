# Ed-Tech Learning Platform - AI Agent Instructions

## Architecture Overview

This is a **full-stack educational platform** with a vanilla JavaScript frontend and Node.js/Express backend. The architecture follows a traditional client-server model with OTP-based email verification and **comprehensive course management**.

### Key Components
- **Client** (`client/`): Vanilla HTML/CSS/JS (no framework) - static files served by Express
- **Server** (`server/`): Express REST API with MongoDB, JWT auth, and Gemini AI integration
- **Database**: MongoDB with Mongoose ODM (User, Course, Enrollment models)
- **AI Chatbot**: Google Gemini API with strict educational-only system prompt
- **Course System**: Full CRUD for courses with role-based access (teachers create, students enroll)

## Critical Data Flows

### 1. Authentication Flow (OTP-Based Registration)
**Flow**: `Signup.html` → Send OTP → Verify OTP → Register → JWT Token → localStorage → Role-based Redirect
```
POST /api/auth/send-otp → otpStore (in-memory Map) → nodemailer
POST /api/auth/verify-otp → validates OTP (10min expiry)
POST /api/auth/register → bcrypt hash → MongoDB → JWT token
POST /api/auth/login → password compare → JWT token → redirect by userType
  - Teachers: teacher-dashboard.html
  - Students: courses.html
```

**Important**: OTP is stored in-memory (`utils/otpStore.js`). This will NOT persist across server restarts. Production should use Redis.

### 2. Client-Side Auth State
Auth state managed via `localStorage`:
- `userToken`: JWT token (used for protected API requests)
- `userName`: Display name
- `userType`: Either "student" or "teacher"
- `userId`: User's MongoDB _id (used for enrollment checks)

**Pattern**: Check auth on page load with `checkAuthStatus()` in `script.js`. Protected routes use `protect` middleware + role checks.

### 3. Course Management Flow
**Teacher Flow**: `teacher-dashboard.html` → Create Course → POST `/api/courses` → MongoDB
**Student Flow**: `courses.html` (browse) → `course-detail.html` → Enroll → POST `/api/courses/:id/enroll` → Enrollment collection

**Key Routes**:
```
Public: GET /api/courses (browse), GET /api/courses/:id (detail)
Teacher: POST/PUT/DELETE /api/courses (CRUD), GET /api/courses/my/created
Student: POST /api/courses/:id/enroll, GET /api/courses/my/enrolled
```

**Authorization**: `protect` middleware verifies JWT, `teacherOnly`/`studentOnly` enforce roles.

### 4. Gemini AI Chatbot Integration
**Flow**: `chatbot.html` → POST `/api/chat/gemini` → Google Gemini API → response parsed and rendered

**Key Detail**: System prompt is **duplicated** in both `geminiController.js` (server) and `chatbot.html` (client). The server-side prompt is the authoritative one. Client-side version is for reference only.

**API Structure**:
```javascript
// Request payload
{ userMessage: "user's question" }

// Response structure
result.candidates[0].content.parts[0].text
```

## Environment Variables (.env)

Required in `server/.env`:
```
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret_key
EMAIL_USER=gmail_account
EMAIL_PASS=gmail_app_password
GOOGLE_API_KEY=gemini_api_key
PORT=5000
```

**Gmail Setup**: Uses nodemailer with Gmail. Requires app-specific password (not regular password).

## Development Workflow

### Start Server
```bash
cd server
npm install
npm run dev  # Uses nodemon for hot reload
```

### Access Client
Server serves static files from `public/` directory. Access client files at:
- `http://localhost:5000/` - Will need to configure static serving or use separate server

**Current Gap**: `server.js` has `app.use(express.static('public'))` but client files are in `client/` directory, not `public/`. Either:
1. Move client files to `server/public/`, OR
2. Change static path to `'../client'`

## Project-Specific Patterns

### 1. Vanilla JS Form Validation
No form libraries. Manual validation in `script.js`:
- `isValidEmail()`, `isValidMobile()`, `isValidAge()` (min 13 years)
- `showError()` dynamically injects error messages below fields
- All API calls use `fetch()` with async/await

### 2. User Model Pattern
`models/User.js` uses Mongoose middleware for password hashing:
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) next();
  this.password = await bcrypt.hash(this.password, 10);
});
```

**Important**: Password is auto-hashed on save. Don't hash twice.

### 3. CORS Configuration
CORS is configured with `"origin": "*"` (allows all origins). Tighten this for production.

### 4. API URL Pattern
Client uses hardcoded API URL:
```javascript
const API_URL = 'http://localhost:5000/api';
```
For deployment, replace with environment-based URL or relative paths.

## Missing Features / Extension Points

1. **Auth Middleware Implemented**: JWT verification (`protect`) and role-based access (`teacherOnly`, `studentOnly`) now active.

2. **Password Reset Implemented**: OTP-based password reset is now available at `/forgot-password.html`. See `PASSWORD_RESET_FEATURE.md` for details.

3. **Course Management Implemented**: Full CRUD system for courses. See `COURSE_MANAGEMENT_SYSTEM.md` for complete documentation.

4. **Still Missing**:
   - File upload system (AWS S3/Cloudinary) for videos, PDFs, thumbnails
   - Payment gateway integration (Razorpay/Stripe)
   - Assignment submission and grading
   - Quiz/test functionality
   - Course reviews and ratings submission UI
   - Live class scheduling integration
   - Email notifications for enrollments

5. **In-Memory OTP Store**: Replace `utils/otpStore.js` with Redis for production.

6. **No Database Migrations**: Direct Mongoose models. Schema changes require manual updates.

## Common Tasks

### Add New API Route
1. Create controller in `controllers/` (or add to existing)
2. Register route in `server.js` (all routes defined here, no separate router file)
3. Update client-side `script.js` to call new endpoint

### Add New Page
1. Create HTML file in `client/`
2. Link shared `style.css` and `script.js`
3. Use `checkAuthStatus()` for conditional nav rendering

### Modify Gemini System Prompt
Edit `controllers/geminiController.js` line ~6-30. The prompt enforces educational-only responses. Test thoroughly if changing restrictions.

### Add User Fields
1. Update `models/User.js` schema
2. Update registration form in `Signup.html`
3. Update `validateSignup()` in `script.js`
4. Update `authController.registerUser()`

## Testing Notes

- **No test suite exists yet**. Start with integration tests for auth flow.
- **Manual testing**: Use Postman/Thunder Client for API testing.
- **Gmail OTP**: Test emails may go to spam. Check spam folder.

## File Organization

```
server/
├── server.js           # Main entry point, all routes defined here
├── config/db.js        # MongoDB connection logic
├── controllers/        # Route handlers (auth, gemini, course)
├── middleware/         # JWT auth middleware (protect, teacherOnly, studentOnly)
├── models/             # Mongoose schemas (User, Course, Enrollment)
└── utils/              # Helpers (OTP store, email sender)

client/
├── index.html          # Landing page
├── login.html          # Login form
├── Signup.html         # Registration with OTP
├── forgot-password.html # Password reset flow
├── chatbot.html        # Gemini AI chatbot interface
├── teacher-dashboard.html # Teacher course management
├── courses.html        # Public course catalog
├── my-courses.html     # Student enrolled courses
├── course-detail.html  # Individual course page
├── script.js           # Shared JavaScript (auth, validation, API calls, course functions)
└── style.css           # Shared styles
```

**Pattern**: One shared `script.js` for all pages. Functions are page-aware (check if element exists before binding).
