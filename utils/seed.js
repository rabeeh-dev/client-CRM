require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../models/User');

const seedAdmin = async () => {
    try {
        const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clientworkspace.io';
        const password = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';
        const firstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'System';
        const lastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator';

        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace');
        console.log('Database connected.');

        // Search for an existing administrator account
        let admin = await User.findOne({ role: 'admin' });

        if (admin) {
            console.log(`Found existing administrator account: ${admin.username}`);
            console.log('Syncing administrator details with .env values...');
            
            admin.firstName = firstName;
            admin.lastName = lastName;
            admin.username = username.toLowerCase();
            admin.email = email.toLowerCase();
            admin.password = password; // Schema pre-save hook will hash it automatically upon save
            
            await admin.save();
            console.log('Administrator account updated successfully.');
        } else {
            console.log('No administrator account found. Creating new administrator...');
            admin = new User({
                firstName,
                lastName,
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password,
                role: 'admin'
            });
            await admin.save();
            console.log('Administrator account created successfully.');
        }

        console.log('============================================');
        console.log('   ADMINISTRATOR ACCOUNT CONFIGURATION');
        console.log('============================================');
        console.log(`Username: ${username}`);
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log('============================================');
        console.log('Details updated successfully.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error.message);
        process.exit(1);
    }
};

seedAdmin();
