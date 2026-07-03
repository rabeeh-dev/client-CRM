const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255
    },
    message: {
        type: String,
        required: true
    },
    emailType: {
        type: String,
        enum: ['contract', 'invoice', 'proposal', 'update', 'welcome_guide', 'final_note', 'custom'],
        default: 'custom'
    },
    attachments: [{
        filename: String,
        url: String,
        size: Number
    }],
    deliveryStatus: {
        type: String,
        enum: ['sent', 'delivered', 'failed', 'pending'],
        default: 'sent'
    },
    sentDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Email', emailSchema);
