# Google Drive Upload Integration Guide

## Overview
This guide explains how to set up and use the Google Drive integration for uploading course content (videos, PDFs, and documents).

## Features

### 1. **Automatic Upload During Content Creation**
- When teachers add new content using the "Upload File" option
- Files are automatically uploaded to Google Drive
- Direct links are stored in the course content

### 2. **Manual Upload to Drive**
- Convert existing external URLs to Google Drive storage
- Button appears for non-Drive content items
- Downloads file from original URL and re-uploads to Drive

### 3. **Visual Status Indicators**
- ☁️ **Green Badge**: Content is stored in Google Drive
- 🔗 **Orange Badge**: Content is hosted externally
- Upload progress indicator during file uploads

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - User Type: External (for testing) or Internal (for organization)
   - App name: "Ed-Tech Platform"
   - User support email: Your email
   - Developer contact: Your email
4. Choose "Web application" as application type
5. Add authorized redirect URIs:
   ```
   http://localhost:5000/auth/google/callback
   https://your-production-domain.com/auth/google/callback
   ```
6. Save and copy:
   - **Client ID**
   - **Client Secret**

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` in the `server` folder:
   ```bash
   cd server
   copy .env.example .env
   ```

2. Edit `.env` and add your Google credentials:
   ```env
   # Google Drive OAuth2 Configuration
   GOOGLE_OAUTH_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret_here
   GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5000/auth/google/callback
   ```

### Step 4: Get Refresh Token

1. Start your server:
   ```bash
   cd server
   npm run dev
   ```

2. Open browser and visit:
   ```
   http://localhost:5000/auth/google
   ```

3. Authorize the application with your Google account
4. Copy the **Refresh Token** displayed on the success page
5. Add it to your `.env` file:
   ```env
   GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token_here
   ```

6. Restart your server to apply changes

### Step 5: (Optional) Create Drive Folders

For better organization, create dedicated folders in Google Drive:

1. Create folders in your Google Drive:
   - `EdTech-Videos`
   - `EdTech-Documents`
   - `EdTech-Images`

2. Get folder IDs from the URL when you open each folder:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```

3. Add to `.env`:
   ```env
   GOOGLE_DRIVE_VIDEOS_FOLDER_ID=your_videos_folder_id
   GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID=your_docs_folder_id
   GOOGLE_DRIVE_IMAGES_FOLDER_ID=your_images_folder_id
   ```

## Usage Guide

### For Teachers: Upload New Content

1. Navigate to **Teacher Dashboard**
2. Select a course and click "Manage Content"
3. Fill in content details:
   - **Title**: Content name
   - **Content Type**: Video, PDF, Assignment, or Text
4. Choose content source:
   - **Paste URL**: Enter direct link to file
   - **📤 Upload File**: Upload from your computer
5. If uploading file:
   - Select content type first
   - Click file upload area
   - Choose file (size limits apply)
   - File automatically uploads to Google Drive
6. Click "Add Content"

### For Teachers: Convert External URLs to Drive

1. Go to course content management
2. Find content items with 🔗 **External Link** badge
3. Click **☁️ Upload to Drive** button
4. Wait for upload process:
   - ⏳ Downloading from original URL
   - ☁️ Uploading to Google Drive
   - ⏳ Updating content URL
5. Success! Content now shows ☁️ **Google Drive** badge

### File Size Limits

- **Videos**: 100 MB
- **PDFs/Documents**: 10 MB
- **Images**: 5 MB

### Supported File Types

**Videos**: MP4, MOV, AVI, MKV, WEBM
**Documents**: PDF, DOC, DOCX, PPT, PPTX
**Images**: JPEG, JPG, PNG, GIF, WEBP

## Troubleshooting

### "Permission denied" Error
**Problem**: OAuth credentials not configured correctly
**Solution**:
1. Verify `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env`
2. Check that redirect URI matches exactly in Google Cloud Console
3. Re-authorize by visiting `/auth/google`

### "Folder not found" Error
**Problem**: Folder IDs are incorrect or folder doesn't exist
**Solution**:
1. Verify folder IDs in `.env`
2. Ensure folders are accessible by the authorized Google account
3. Remove folder IDs to use 'root' folder instead

### "Upload failed" Error
**Problem**: File size exceeds limit or invalid file type
**Solution**:
1. Check file size limits above
2. Verify file type is supported
3. Try with a smaller file first

### Refresh Token Expired
**Problem**: `GOOGLE_OAUTH_REFRESH_TOKEN` is invalid or expired
**Solution**:
1. Visit `/auth/google` again
2. Re-authorize the application
3. Update `.env` with new refresh token
4. Restart server

### CORS Errors
**Problem**: Socket.IO CORS configuration not including your origin
**Solution**: Already fixed in `server.js` - allowed origins include:
- `http://localhost:5000`
- `http://127.0.0.1:5500`
- `http://localhost:5500`
- Production URL

## Architecture Overview

### Upload Flow

```
Teacher uploads file
    ↓
Client: script.js → uploadFileToServer()
    ↓
Server: /api/upload/video or /api/upload/document
    ↓
Controller: uploadController.js
    ↓
Google Drive: googleDrive.js → uploadToGoogleDrive()
    ↓
Returns: { fileId, url, webViewLink }
    ↓
Client: Stores URL in course content
```

### Manual Drive Upload Flow

```
Teacher clicks "Upload to Drive"
    ↓
Client: script.js → uploadContentToDrive()
    ↓
Download file from original URL
    ↓
Upload to Google Drive via /api/upload/*
    ↓
Update content URL via PUT /api/courses/:id/content/:contentId
    ↓
Display updated content with Drive badge
```

## API Endpoints

### Upload Endpoints
- `POST /api/upload/video` - Upload video to Google Drive
- `POST /api/upload/document` - Upload PDF/DOC to Google Drive
- `POST /api/upload/image` - Upload image to Google Drive

### Content Management
- `POST /api/courses/:id/content` - Add new content
- `PUT /api/courses/:id/content/:contentId` - Update content item
- `DELETE /api/courses/:id/content/:contentId` - Delete content

### OAuth
- `GET /auth/google` - Initialize OAuth flow
- `GET /auth/google/callback` - OAuth callback handler

## Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Refresh tokens** should be kept secure and rotated periodically
3. **File permissions** - Uploaded files are set to 'anyone with link can view'
4. **Rate limits** - Google Drive API has quotas, monitor usage

## Production Deployment

1. Update redirect URI in Google Cloud Console with production URL
2. Set `NODE_ENV=production` in production `.env`
3. Use environment variables or secure secret management
4. Consider using service account for production (more reliable)
5. Monitor Google Drive API quota usage

## Support

If you encounter issues:
1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Google Drive API is enabled in Cloud Console
4. Test with small files first
5. Check network connectivity and firewall settings

## Future Enhancements

- [ ] Batch upload multiple files
- [ ] Progress bar for large file uploads
- [ ] Video thumbnail extraction
- [ ] PDF preview in browser
- [ ] Direct video streaming from Drive
- [ ] File version history
- [ ] Automatic backup to Drive
