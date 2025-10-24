const { oauth2Client } = require('../config/googleDrive');

// @desc    Get OAuth authorization URL
// @route   GET /auth/google
// @access  Public (admin only in production)
const getAuthUrl = (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent'  // Force to get refresh token
    });
    res.redirect(authUrl);
};

// @desc    OAuth callback - Exchange code for tokens
// @route   GET /auth/google/callback
// @access  Public (admin only in production)
const handleCallback = async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code not provided');
    }

    try {
        // Exchange authorization code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Display the refresh token (to be added to .env)
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Google Drive Authorization Success</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    h1 {
                        color: #4CAF50;
                    }
                    .token-box {
                        background: #f9f9f9;
                        border: 2px solid #4CAF50;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 20px 0;
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 12px;
                    }
                    .instructions {
                        background: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .success {
                        color: #4CAF50;
                        font-size: 48px;
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✅</div>
                    <h1>Authorization Successful!</h1>
                    <p>Your Google Drive has been successfully authorized.</p>
                    
                    <h2>📋 Next Steps:</h2>
                    <div class="instructions">
                        <ol>
                            <li><strong>Copy the refresh token below</strong></li>
                            <li>Open your <code>server/.env</code> file</li>
                            <li>Find the line: <code>GOOGLE_OAUTH_REFRESH_TOKEN=</code></li>
                            <li>Paste the token after the <code>=</code> sign</li>
                            <li>Save the file</li>
                            <li>Restart your server</li>
                        </ol>
                    </div>

                    <h3>Your Refresh Token:</h3>
                    <div class="token-box">
                        ${tokens.refresh_token || 'No refresh token received. Try re-authorizing.'}
                    </div>

                    ${tokens.refresh_token ? `
                        <div class="instructions">
                            <strong>⚠️ Important:</strong>
                            <ul>
                                <li>Keep this token secret!</li>
                                <li>Never commit it to Git</li>
                                <li>Store it only in your .env file</li>
                            </ul>
                        </div>
                    ` : `
                        <div class="instructions" style="background: #f8d7da; border-color: #dc3545;">
                            <strong>❌ No Refresh Token Received</strong>
                            <p>This might happen if you've authorized this app before.</p>
                            <p><strong>To fix:</strong></p>
                            <ol>
                                <li>Go to: <a href="https://myaccount.google.com/permissions" target="_blank">https://myaccount.google.com/permissions</a></li>
                                <li>Remove "EdTech File Uploader" access</li>
                                <li>Try authorizing again: <a href="/auth/google">Click here</a></li>
                            </ol>
                        </div>
                    `}

                    <h3>✅ What's Next?</h3>
                    <p>After adding the refresh token to .env and restarting:</p>
                    <ul>
                        <li>✅ Files will upload to YOUR personal Drive (${tokens.scope})</li>
                        <li>✅ You can manage files at <a href="https://drive.google.com" target="_blank">drive.google.com</a></li>
                        <li>✅ Files will appear in your EdTech folders</li>
                        <li>✅ Using your 2TB storage!</li>
                    </ul>

                    <p><a href="/" style="color: #4CAF50; text-decoration: none; font-weight: bold;">← Back to Home</a></p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error getting tokens:', error);
        res.status(500).send(`
            <h1>Error Getting Tokens</h1>
            <p>${error.message}</p>
            <p><a href="/auth/google">Try again</a></p>
        `);
    }
};

// @desc    Test OAuth connection
// @route   GET /auth/google/test
// @access  Public
const testConnection = async (req, res) => {
    try {
        const { oauth2Client } = require('../config/googleDrive');
        
        // Check if we have credentials
        const credentials = oauth2Client.credentials;
        if (!credentials || !credentials.refresh_token) {
            return res.json({
                success: false,
                message: 'No refresh token found. Please authorize first.',
                authUrl: '/auth/google'
            });
        }

        // Try to access Drive
        const { drive } = require('../config/googleDrive');
        const response = await drive.about.get({ fields: 'user, storageQuota' });
        
        res.json({
            success: true,
            message: 'Google Drive connected successfully',
            user: response.data.user,
            storage: {
                limit: response.data.storageQuota.limit,
                usage: response.data.storageQuota.usage,
                usageInDrive: response.data.storageQuota.usageInDrive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Google Drive connection failed',
            error: error.message,
            hint: 'Make sure GOOGLE_OAUTH_REFRESH_TOKEN is set in .env'
        });
    }
};

module.exports = {
    getAuthUrl,
    handleCallback,
    testConnection
};
