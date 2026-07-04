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
        const today = new Date();
        
        if (status) {
            if (status === 'overdue') {
                query.$or = [
                    { status: 'overdue' },
                    { status: 'pending', dueDate: { $lt: today } }
                ];
            } else if (status === 'pending') {
                query.status = 'pending';
                query.dueDate = { $gte: today };
            } else {
                query.status = status;
            }
        }
        if (search) {
            query.invoiceNumber = { $regex: search, $options: 'i' };
        }

        // Fetch payments/invoices
        const payments = await Payment.find(query)
            .populate('clientId', 'name company')
            .populate('projectId', 'name budget value')
            .sort({ createdAt: -1 });

        // Calculate billing metrics across all active invoices (unfiltered)
        const allPayments = await Payment.find({ userId, isDeleted: false });
        let totalInvoiced = 0;
        let collectedAmount = 0;
        let overdueCount = 0;
        let revenueThisMonth = 0;
        let revenueThisYear = 0;

        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);

        allPayments.forEach(pay => {
            totalInvoiced += pay.amount;
            
            pay.transactions.forEach(t => {
                collectedAmount += t.amount;
                
                const tDate = new Date(t.date);
                if (tDate >= startOfMonth && tDate <= endOfMonth) {
                    revenueThisMonth += t.amount;
                }
                if (tDate >= startOfYear && tDate <= endOfYear) {
                    revenueThisYear += t.amount;
                }
            });

            // Check overdue
            const isOverdue = pay.status !== 'paid' && pay.dueDate < today;
            if (isOverdue || pay.status === 'overdue') {
                overdueCount++;
            }
        });

        // Get list of clients & projects for selector dropdowns in Add Invoice modal
        const clients = await Client.find({ userId, isDeleted: false }).sort({ name: 1 });
        const projects = await Project.find({ userId, isDeleted: false }).sort({ name: 1 });

        let totalContracted = 0;
        projects.forEach(p => {
            totalContracted += (p.budget || p.value || 0);
        });

        const outstandingBalance = Math.max(0, totalContracted - collectedAmount);

        res.render('payments/index', {
            title: 'Payments Ledger | Client CRM',
            payments,
            clients,
            projects,
            metrics: {
                totalInvoiced: totalContracted, // alias as totalInvoiced for template compatibility
                collectedAmount,
                outstandingBalance,
                overdueCount,
                revenueThisMonth,
                revenueThisYear
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

// Create a Payment Receipt
exports.createInvoice = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { amount, date, method, notes, projectId } = req.body;

        if (!amount || !projectId) {
            return res.status(400).json({ success: false, message: 'Payment amount and project are required' });
        }

        const project = await Project.findOne({ _id: projectId, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const receiptDate = date ? new Date(date) : new Date();
        const invoiceNumber = `RCPT-${Date.now().toString().slice(-6)}`;

        const payment = new Payment({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            invoiceNumber,
            amount: Number(amount) || 0,
            dueDate: receiptDate,
            paidDate: receiptDate,
            status: 'paid',
            transactions: [{
                amount: Number(amount) || 0,
                date: receiptDate,
                method: method || 'bank_transfer',
                notes: notes || ''
            }]
        });

        await payment.save();

        // Increment project amountReceived
        project.amountReceived = (project.amountReceived || 0) + Number(amount);
        await project.save();

        // Log timeline activity
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'payment',
            description: `Recorded payment received of ₹${payment.amount.toLocaleString()} via ${method ? method.replace('_', ' ').toUpperCase() : 'BANK TRANSFER'} for project '${project.name}' (Notes: ${notes || 'None'}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Payment recorded successfully', payment });
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

        // Increment project amountReceived
        if (payment.projectId) {
            const project = await Project.findOne({ _id: payment.projectId, userId });
            if (project) {
                project.amountReceived = (project.amountReceived || 0) + Number(amount);
                await project.save();
            }
        }

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

        // Decrement project amountReceived by the total paid on this invoice
        if (payment.projectId) {
            const project = await Project.findOne({ _id: payment.projectId, userId });
            if (project) {
                let totalPaid = 0;
                payment.transactions.forEach(t => {
                    totalPaid += t.amount;
                });
                project.amountReceived = Math.max(0, (project.amountReceived || 0) - totalPaid);
                await project.save();
            }
        }

        res.json({ success: true, message: `Invoice #${payment.invoiceNumber} deleted successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
