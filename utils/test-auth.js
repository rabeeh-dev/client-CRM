require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const test = async () => {
    try {
        const usernameInput = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const passwordInput = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';

        console.log('Testing auth for:', usernameInput);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace');
        
        const user = await User.findOne({ username: usernameInput.toLowerCase() });
        if (!user) {
            console.log('User NOT found in database!');
            process.exit(0);
        }
        
        console.log('User found. Stored Hash:', user.password);
        const matchDirect = await bcrypt.compare(passwordInput, user.password);
        console.log('Direct bcrypt.compare match:', matchDirect);

        const matchMethod = await user.comparePassword(passwordInput);
        console.log('Schema method comparePassword match:', matchMethod);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

test();
