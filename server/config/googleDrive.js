const { google } = require('googleapis');
const multer = require('multer');
const stream = require('stream');

// Configure Google Drive API with OAuth 2.0 (User Authorization)
// This allows files to be uploaded to the authorized user's personal Drive
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
);

// Set refresh token if available
if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN
    });
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Folder IDs in your Google Drive (create these folders first)
const FOLDERS = {
    VIDEOS: process.env.GOOGLE_DRIVE_VIDEOS_FOLDER_ID || 'root',
    DOCUMENTS: process.env.GOOGLE_DRIVE_DOCUMENTS_FOLDER_ID || 'root',
    IMAGES: process.env.GOOGLE_DRIVE_IMAGES_FOLDER_ID || 'root'
};

// Configure multer for memory storage (files stored in memory before upload)
const storage = multer.memoryStorage();

// File size limits
const fileSizeLimits = {
    video: 100 * 1024 * 1024,  // 100MB
    document: 10 * 1024 * 1024, // 10MB
    image: 5 * 1024 * 1024      // 5MB
};

// Upload video with size limit
const uploadVideo = multer({
    storage: storage,
    limits: { fileSize: fileSizeLimits.video },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/webm'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files allowed.'));
        }
    }
});

// Upload document with size limit
const uploadDocument = multer({
    storage: storage,
    limits: { fileSize: fileSizeLimits.document },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX allowed.'));
        }
    }
});

// Upload image with size limit
const uploadImage = multer({
    storage: storage,
    limits: { fileSize: fileSizeLimits.image },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images allowed.'));
        }
    }
});

/**
 * Upload file to Google Drive
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Name of the file
 * @param {String} mimeType - MIME type of the file
 * @param {String} folderId - Google Drive folder ID
 * @returns {Promise} - Returns file ID and webViewLink
 */
const uploadToGoogleDrive = async (fileBuffer, fileName, mimeType, folderId = 'root') => {
    try {
        console.log(`🔄 Uploading to Google Drive: ${fileName} (${mimeType}) to folder: ${folderId}`);
        
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        console.log('📤 Creating file in Google Drive...');
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: mimeType
            },
            media: {
                mimeType: mimeType,
                body: bufferStream
            },
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true  // Enable support for shared folders
        });

        console.log(`✅ File created with ID: ${response.data.id}`);

        // Make file publicly accessible
        console.log('🔓 Setting file permissions...');
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            },
            supportsAllDrives: true  // Enable support for shared folders
        });

        console.log('✅ Permissions set successfully');

        // Get shareable link
        const file = await drive.files.get({
            fileId: response.data.id,
            fields: 'id, name, webViewLink, webContentLink',
            supportsAllDrives: true  // Enable support for shared folders
        });

        console.log(`✅ Upload complete! File: ${file.data.name}`);

        return {
            fileId: file.data.id,
            fileName: file.data.name,
            webViewLink: file.data.webViewLink,
            webContentLink: file.data.webContentLink,
            // Direct link for embedding (works better than webViewLink)
            directLink: `https://drive.google.com/uc?export=view&id=${file.data.id}`
        };
    } catch (error) {
        console.error('❌ Error uploading to Google Drive:', error.message);
        console.error('Full error:', error);
        
        // Better error messages
        if (error.code === 403) {
            throw new Error('Permission denied. Make sure the folder is shared with the service account.');
        } else if (error.code === 404) {
            throw new Error('Folder not found. Check the folder ID in .env');
        } else {
            throw new Error(`Google Drive upload failed: ${error.message}`);
        }
    }
};

/**
 * Delete file from Google Drive
 * @param {String} fileId - Google Drive file ID
 * @returns {Promise}
 */
const deleteFromGoogleDrive = async (fileId) => {
    try {
        await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true  // Enable support for shared folders
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting from Google Drive:', error);
        throw error;
    }
};

module.exports = {
    drive,
    oauth2Client,  // Export for OAuth routes
    uploadVideo,
    uploadDocument,
    uploadImage,
    uploadToGoogleDrive,
    deleteFromGoogleDrive,
    FOLDERS
};
