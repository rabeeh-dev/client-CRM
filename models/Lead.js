const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['call', 'email', 'meeting', 'note'],
        required: true
    },
    description: {
        type: String,
        required: [true, 'Interaction description is required'],
        maxlength: 2000
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const followUpSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: [true, 'Follow-up date is required']
    },
    note: {
        type: String,
        maxlength: 500
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
});

const leadSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: [true, 'Lead name is required'],
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
    source: {
        type: String,
        enum: ['referral', 'website', 'social_media', 'cold_outreach', 'freelance_platform', 'event', 'other'],
        default: 'other'
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'proposal_sent', 'negotiation', 'won', 'lost'],
        default: 'new'
    },
    estimatedValue: {
        type: Number,
        min: 0,
        default: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    notes: {
        type: String,
        maxlength: 5000
    },
    socialMedia: {
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        instagram: { type: String, trim: true },
        whatsapp: { type: String, trim: true }
    },
    interactions: [interactionSchema],
    followUps: [followUpSchema],
    convertedClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        default: null
    },
    convertedAt: {
        type: Date,
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
