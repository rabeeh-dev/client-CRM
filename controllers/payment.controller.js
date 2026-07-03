const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

// List Invoices & Payments with stats
exports.getPayments = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { search, status } = req.query;

        // Build query
        const query = { userId, isDeleted: false };
        if (status) {
            query.status = status;
        }
        if (search) {
            query.invoiceNumber = { $regex: search, $options: 'i' };
        }

        // Fetch payments/invoices
        const payments = await Payment.find(query)
            .populate('clientId', 'name company')
            .populate('projectId', 'name')
            .sort({ createdAt: -1 });

        // Calculate billing metrics across all active invoices (unfiltered)
        const allPayments = await Payment.find({ userId, isDeleted: false });
        let totalInvoiced = 0;
        let collectedAmount = 0;
        let overdueCount = 0;

        const today = new Date();

        allPayments.forEach(pay => {
            totalInvoiced += pay.amount;
            
            // Sum all transaction amounts
            let paidSum = 0;
            pay.transactions.forEach(t => {
                paidSum += t.amount;
            });
            collectedAmount += paidSum;

            // Check overdue
            const isOverdue = pay.status !== 'paid' && pay.dueDate < today;
            if (isOverdue || pay.status === 'overdue') {
                overdueCount++;
            }
        });

        const outstandingBalance = totalInvoiced - collectedAmount;

        // Get list of clients & projects for selector dropdowns in Add Invoice modal
        const clients = await Client.find({ userId, isDeleted: false }).sort({ name: 1 });
        const projects = await Project.find({ userId, isDeleted: false }).sort({ name: 1 });

        res.render('payments/index', {
            title: 'Invoice Payments | Client CRM',
            payments,
            clients,
            projects,
            metrics: {
                totalInvoiced,
                collectedAmount,
                outstandingBalance,
                overdueCount
            },
            filters: {
                search: search || '',
                status: status || ''
            },
            activePage: 'payments'
        });
    } catch (err) {
        next(err);
    }
};

// Fetch Invoice details with transaction history
exports.getPaymentDetail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const payment = await Payment.findOne({ _id: req.params.id, userId, isDeleted: false })
            .populate('clientId')
            .populate('projectId');

        if (!payment) {
            const err = new Error('Invoice not found');
            err.statusCode = 404;
            throw err;
        }

        // Calculate total paid and remaining balance
        let totalPaid = 0;
        payment.transactions.forEach(t => {
            totalPaid += t.amount;
        });

        const remainingBalance = Math.max(0, payment.amount - totalPaid);

        res.render('payments/detail', {
            title: `Invoice #${payment.invoiceNumber} | Details`,
            payment,
            totalPaid,
            remainingBalance,
            activePage: 'payments'
        });
    } catch (err) {
        next(err);
    }
};

// Create a Payment Invoice
exports.createInvoice = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { invoiceNumber, amount, dueDate, clientId, projectId } = req.body;

        if (!invoiceNumber || !amount || !dueDate || !clientId) {
            return res.status(400).json({ success: false, message: 'Invoice number, amount, due date and client are required' });
        }

        const payment = new Payment({
            userId,
            clientId,
            projectId: projectId || undefined,
            invoiceNumber,
            amount: Number(amount) || 0,
            dueDate: new Date(dueDate),
            status: 'pending'
        });

        await payment.save();

        // Log timeline activity
        const activity = new Activity({
            userId,
            clientId,
            projectId: projectId || undefined,
            type: 'payment',
            description: `Invoice #${payment.invoiceNumber} created for amount ₹${payment.amount.toLocaleString()} (Due Date: ${new Date(payment.dueDate).toLocaleDateString()}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Invoice created successfully', payment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Log Transaction Installment Payment towards Invoice
exports.addTransaction = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { amount, date, method, notes } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Transaction amount is required' });
        }

        const payment = await Payment.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // Add transaction installment
        payment.transactions.push({
            amount: Number(amount) || 0,
            date: date ? new Date(date) : new Date(),
            method: method || 'bank_transfer',
            notes: notes || ''
        });

        // Recalculate status and paid amounts
        let totalPaid = 0;
        payment.transactions.forEach(t => {
            totalPaid += t.amount;
        });

        if (totalPaid >= payment.amount) {
            payment.status = 'paid';
            payment.paidDate = new Date();
        } else {
            payment.status = 'pending';
        }

        await payment.save();

        // Log to activity timeline
        const formattedMethod = method ? method.replace('_', ' ').toUpperCase() : 'BANK TRANSFER';
        const activity = new Activity({
            userId,
            clientId: payment.clientId,
            projectId: payment.projectId || undefined,
            type: 'payment',
            description: `Logged payment transaction of ₹${Number(amount).toLocaleString()} via ${formattedMethod} for Invoice #${payment.invoiceNumber}.`
        });
        await activity.save();

        res.json({ 
            success: true, 
            message: 'Payment transaction logged successfully', 
            totalPaid, 
            remainingBalance: Math.max(0, payment.amount - totalPaid),
            status: payment.status
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Invoice (Soft Delete)
exports.deleteInvoice = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const payment = await Payment.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        payment.isDeleted = true;
        await payment.save();

        res.json({ success: true, message: `Invoice #${payment.invoiceNumber} deleted successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
