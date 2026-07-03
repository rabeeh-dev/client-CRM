const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: [true, 'Project name is required'],
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 2000
    },
    status: {
        type: String,
        enum: ['planning', 'in_progress', 'completed', 'on_hold'],
        default: 'planning'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    value: {
        type: Number,
        default: 0,
        min: 0
    },
    budget: {
        type: Number,
        default: 0,
        min: 0
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    checklist: {
        homepage: { type: Boolean, default: false },
        shop: { type: Boolean, default: false },
        adminPanel: { type: Boolean, default: false },
        testing: { type: Boolean, default: false },
        deployment: { type: Boolean, default: false },
        delivery: { type: Boolean, default: false }
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Sync budget and value before saving
projectSchema.pre('save', function(next) {
    if (this.budget !== undefined) {
        this.value = this.budget;
    } else if (this.value !== undefined) {
        this.budget = this.value;
    }
    next();
});

module.exports = mongoose.model('Project', projectSchema);
