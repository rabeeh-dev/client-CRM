const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
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
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    type: {
        type: String,
        enum: ['general', 'project', 'payment', 'document', 'email', 'call', 'meeting', 'note'],
        default: 'general'
    },
    description: {
        type: String,
        required: [true, 'Activity description is required'],
        maxlength: 2000
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
