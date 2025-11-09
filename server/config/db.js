const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        console.error('Please check:');
        console.error('1. MongoDB Atlas cluster is running');
        console.error('2. Your IP address is whitelisted in MongoDB Atlas');
        console.error('3. MONGODB_URI in .env is correct');
        console.error('4. Network connection is stable');
        process.exit(1);
    }
};

module.exports = connectDB;