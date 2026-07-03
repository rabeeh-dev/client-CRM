const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [100, 'First name cannot exceed 100 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [100, 'Last name cannot exceed 100 characters']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [50, 'Username cannot exceed 50 characters'],
        match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain alphanumeric characters and underscores']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    role: {
        type: String,
        enum: ['admin'],
        default: 'admin'
    },
    profileImage: {
        type: String,
        default: null
    },
    company: {
        name: { type: String, default: '' },
        logo: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
        email: { type: String, default: '' }
    },
    smtp: {
        senderEmail: { type: String, default: '' }
    },
    preferences: {
        currency: { type: String, default: 'INR' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' }
    }
}, {
    timestamps: true
});

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Schema method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
