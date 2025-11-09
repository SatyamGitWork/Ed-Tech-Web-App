const Contact = require('../models/Contact');
const { google } = require('googleapis');

// Google Sheets Configuration
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Path to service account JSON
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID; // Add this to .env

// Create a new contact inquiry
exports.createContact = async (req, res) => {
    try {
        const { name, email, phone, course, message } = req.body;

        // Validate required fields
        if (!name || !email || !phone || !course) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (name, email, phone, course)'
            });
        }

        // Save to MongoDB (for backward compatibility and admin dashboard)
        const contact = await Contact.create({
            name,
            email,
            phone,
            course,
            message: message || ''
        });

        // Also save to Google Sheets
        try {
            const values = [
                [
                    new Date().toISOString(),
                    name,
                    email,
                    phone,
                    course,
                    message || '',
                    'pending'
                ]
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sheet1!A:G', // Adjust sheet name as needed
                valueInputOption: 'USER_ENTERED',
                resource: { values },
            });

            console.log('Contact data saved to Google Sheets successfully');
        } catch (sheetError) {
            console.error('Error saving to Google Sheets:', sheetError);
            // Continue even if Google Sheets fails - data is in MongoDB
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for your inquiry! We will get back to you soon.',
            contact
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit contact form. Please try again.'
        });
    }
};

// Get all contact inquiries (Admin/Teacher only)
exports.getAllContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            count: contacts.length,
            contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch contacts'
        });
    }
};

// Update contact status (Admin/Teacher only)
exports.updateContactStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'contacted', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status value'
            });
        }

        const contact = await Contact.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact status updated successfully',
            contact
        });
    } catch (error) {
        console.error('Error updating contact status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update contact status'
        });
    }
};

// Delete contact inquiry (Admin only)
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact inquiry not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact inquiry deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete contact inquiry'
        });
    }
};
