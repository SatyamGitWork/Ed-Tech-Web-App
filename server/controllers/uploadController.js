const { uploadToGoogleDrive, deleteFromGoogleDrive, FOLDERS } = require('../config/googleDrive');

// @desc    Upload video file to Google Drive
// @route   POST /api/upload/video
// @access  Private/Teacher
const uploadVideoFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const result = await uploadToGoogleDrive(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            FOLDERS.VIDEOS
        );

        res.status(200).json({
            success: true,
            message: 'Video uploaded successfully to Google Drive',
            fileId: result.fileId,
            fileName: result.fileName,
            url: result.directLink, // Use directLink for embedding
            webViewLink: result.webViewLink,
            webContentLink: result.webContentLink
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload video to Google Drive',
            error: error.message
        });
    }
};

// @desc    Upload document file (PDF, DOC, etc.) to Google Drive
// @route   POST /api/upload/document
// @access  Private/Teacher
const uploadDocumentFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const result = await uploadToGoogleDrive(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            FOLDERS.DOCUMENTS
        );

        res.status(200).json({
            success: true,
            message: 'Document uploaded successfully to Google Drive',
            fileId: result.fileId,
            fileName: result.fileName,
            url: result.directLink,
            webViewLink: result.webViewLink,
            webContentLink: result.webContentLink
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload document to Google Drive',
            error: error.message
        });
    }
};

// @desc    Upload image file to Google Drive
// @route   POST /api/upload/image
// @access  Private/Teacher
const uploadImageFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const result = await uploadToGoogleDrive(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            FOLDERS.IMAGES
        );

        res.status(200).json({
            success: true,
            message: 'Image uploaded successfully to Google Drive',
            fileId: result.fileId,
            fileName: result.fileName,
            url: result.directLink,
            webViewLink: result.webViewLink,
            webContentLink: result.webContentLink
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload image to Google Drive',
            error: error.message
        });
    }
};

// @desc    Delete uploaded file from Google Drive
// @route   DELETE /api/upload/:fileId
// @access  Private/Teacher
const deleteUploadedFile = async (req, res) => {
    try {
        const { fileId } = req.params;

        if (!fileId) {
            return res.status(400).json({
                success: false,
                message: 'File ID is required'
            });
        }

        await deleteFromGoogleDrive(fileId);

        res.status(200).json({
            success: true,
            message: 'File deleted successfully from Google Drive'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file from Google Drive',
            error: error.message
        });
    }
};

module.exports = {
    uploadVideoFile,
    uploadDocumentFile,
    uploadImageFile,
    deleteUploadedFile
};
