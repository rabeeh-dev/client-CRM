require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const reset = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace');
        console.log('Connected.');

        console.log('Dropping users collection...');
        await mongoose.connection.collection('users').drop().catch(err => {
            console.log('Users collection did not exist or could not be dropped:', err.message);
        });

        console.log('Database cleaned. Exiting.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

reset();
