const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: [true, 'Transaction amount is required'],
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    method: {
        type: String,
        enum: ['bank_transfer', 'cash', 'card', 'upi', 'other'],
        default: 'bank_transfer'
    },
    notes: {
        type: String,
        maxlength: 500
    }
});

const paymentSchema = new mongoose.Schema({
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
    amount: {
        type: Number,
        required: [true, 'Payment amount is required'],
        min: 0
    },
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'overdue'],
        default: 'pending'
    },
    dueDate: {
        type: Date,
        required: [true, 'Due date is required']
    },
    paidDate: {
        type: Date
    },
    transactions: [transactionSchema],
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

paymentSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'paid' && !this.paidDate) {
            this.paidDate = new Date();
        } else if (this.status !== 'paid') {
            this.paidDate = undefined;
        }
    }
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
