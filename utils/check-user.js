require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const User = require('../models/User');

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace');
        const users = await User.find({});
        console.log('Total Users Found:', users.length);
        users.forEach(u => {
            console.log({
                id: u._id,
                username: u.username,
                email: u.email,
                role: u.role,
                passwordHashPrefix: u.password.substring(0, 10),
                createdAt: u.createdAt
            });
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

check();
