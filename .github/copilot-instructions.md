# Ed-Tech Learning Platform - AI Agent Instructions

## Architecture Overview

This is a **full-stack educational platform** with a vanilla JavaScript frontend and Node.js/Express backend. The architecture follows a traditional client-server model with OTP-based email verification.

### Key Components
- **Client** (`client/`): Vanilla HTML/CSS/JS (no framework) - static files served by Express
- **Server** (`server/`): Express REST API with MongoDB, JWT auth, and Gemini AI integration
- **Database**: MongoDB with Mongoose ODM (single `User` model)
- **AI Chatbot**: Google Gemini API with strict educational-only system prompt

## Critical Data Flows

### 1. Authentication Flow (OTP-Based Registration)
**Flow**: `Signup.html` → Send OTP → Verify OTP → Register → JWT Token → localStorage
```
POST /api/auth/send-otp → otpStore (in-memory Map) → nodemailer
POST /api/auth/verify-otp → validates OTP (10min expiry)
POST /api/auth/register → bcrypt hash → MongoDB → JWT token
POST /api/auth/login → password compare → JWT token
```

**Important**: OTP is stored in-memory (`utils/otpStore.js`). This will NOT persist across server restarts. Production should use Redis.

### 2. Client-Side Auth State
Auth state managed via `localStorage`:
- `userToken`: JWT token (used for future authenticated requests)
- `userName`: Display name
- `userType`: Either "student" or "teacher"

**Pattern**: Check auth on page load with `checkAuthStatus()` in `script.js`. No middleware protection yet - add auth middleware when building protected routes.

### 3. Gemini AI Chatbot Integration
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

1. **No Auth Middleware**: JWT tokens are issued but not validated on protected routes. Add middleware like:
   ```javascript
   const authMiddleware = require('./middleware/auth');
   app.get('/api/protected', authMiddleware, controller);
   ```

2. **Password Reset Implemented**: OTP-based password reset is now available at `/forgot-password.html`. See `PASSWORD_RESET_FEATURE.md` for details.

3. **Student vs Teacher Roles**: `userType` field exists but no role-based access control.

4. **In-Memory OTP Store**: Replace `utils/otpStore.js` with Redis for production.

5. **No Database Migrations**: Direct Mongoose models. Schema changes require manual updates.

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
├── controllers/        # Route handlers (auth, gemini)
├── models/             # Mongoose schemas (only User.js)
└── utils/              # Helpers (OTP store, email sender)

client/
├── index.html          # Landing page
├── login.html          # Login form
├── Signup.html         # Registration with OTP
├── chatbot.html        # Gemini AI chatbot interface
├── script.js           # Shared JavaScript (auth, validation, API calls)
└── style.css           # Shared styles
```

**Pattern**: One shared `script.js` for all pages. Functions are page-aware (check if element exists before binding).
