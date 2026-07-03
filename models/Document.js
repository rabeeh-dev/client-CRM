const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: [true, 'Document name is required'],
        trim: true,
        maxlength: 255
    },
    fileUrl: {
        type: String,
        required: [true, 'File URL is required']
    },
    fileSize: {
        type: String,
        default: '0 KB'
    },
    fileType: {
        type: String,
        default: 'PDF'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
