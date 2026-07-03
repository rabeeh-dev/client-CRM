const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Client name is required'],
        trim: true,
        maxlength: 200
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 30
    },
    company: {
        type: String,
        trim: true,
        maxlength: 200
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        default: 5
    },
    notes: {
        type: String,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    socialMedia: {
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        instagram: { type: String, trim: true },
        whatsapp: { type: String, trim: true }
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
