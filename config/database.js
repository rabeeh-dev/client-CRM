const mongoose = require('mongoose');
const logger = require('../utils/logger');
const User = require('../models/User');

const syncAdminUser = async () => {
    try {
        const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clientworkspace.io';
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';
        const firstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'System';
        const lastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator';

        let admin = await User.findOne({ role: 'admin' });

        if (admin) {
            logger.info(`Syncing administrator account '${admin.username}' with current .env configurations...`);
            admin.firstName = firstName;
            admin.lastName = lastName;
            admin.username = username.toLowerCase();
            admin.email = email.toLowerCase();
            admin.password = password; // Schema pre-save hook will hash it automatically upon save
            await admin.save();
            logger.info('Administrator account synchronized successfully.');
        } else {
            logger.info('No administrator account found. Bootstrapping new admin from .env values...');
            admin = new User({
                firstName,
                lastName,
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password,
                role: 'admin'
            });
            await admin.save();
            logger.info('Administrator account created successfully.');
        }
    } catch (err) {
        logger.error(`Error syncing administrator account on startup: ${err.message}`);
    }
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace');
        logger.info(`MongoDB Connected: ${conn.connection.host}`);
        
        // Sync administrator account with current .env values on startup
        await syncAdminUser();
    } catch (error) {
        logger.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;

