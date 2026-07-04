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
    amountReceived: {
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
    checklist: [
        new mongoose.Schema({
            label: {
                type: String,
                required: true,
                trim: true
            },
            completed: {
                type: Boolean,
                default: false
            }
        })
    ],
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
    if (this.isModified('budget') && !this.isModified('value')) {
        this.value = this.budget;
    } else if (this.isModified('value') && !this.isModified('budget')) {
        this.budget = this.value;
    }
    next();
});

module.exports = mongoose.model('Project', projectSchema);
