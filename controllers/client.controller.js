const mongoose = require('mongoose');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const Activity = require('../models/Activity');

/**
 * Get clients list index page.
 */
const getClients = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { search, status, rating } = req.query;

        // Build base query
        const query = {
            userId,
            isDeleted: false
        };

        // Appending filters
        if (status && status !== 'all') {
            query.status = status;
        }
        if (rating && rating !== 'all') {
            query.rating = Number(rating);
        }
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { name: regex },
                { company: regex },
                { email: regex }
            ];
        }

        // Fetch clients
        const clients = await Client.find(query).sort({ createdAt: -1 });

        // Calculate metrics
        const totalClients = await Client.countDocuments({ userId, isDeleted: false });
        
        const ratingResult = await Client.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: false } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        const avgRating = ratingResult.length > 0 ? Math.round(ratingResult[0].avgRating * 10) / 10 : 0;

        const activeProjectsCount = await Project.countDocuments({
            userId,
            isDeleted: false,
            status: { $in: ['planning', 'in_progress', 'on_hold'] }
        });

        res.render('clients/index', {
            title: 'Clients Management | Client Workspace',
            clients,
            metrics: {
                totalClients,
                avgRating,
                activeProjectsCount
            },
            filters: {
                search: search || '',
                status: status || 'all',
                rating: rating || 'all'
            },
            activePage: 'clients'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get specific client detail page.
 */
const getClientDetail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const client = await Client.findOne({ _id: req.params.id, userId, isDeleted: false });

        if (!client) {
            return res.status(404).render('errors/500', {
                title: 'Client Not Found',
                message: 'The requested client record does not exist or has been deleted.',
                error: {}
            });
        }

        // Fetch related sub-resources
        const projects = await Project.find({ clientId: client._id, userId, isDeleted: false }).sort({ createdAt: -1 });
        const payments = await Payment.find({ clientId: client._id, userId, isDeleted: false }).sort({ createdAt: -1 });
        const documents = await Document.find({ clientId: client._id, userId, isDeleted: false }).sort({ createdAt: -1 });
        const activities = await Activity.find({ clientId: client._id, userId }).sort({ date: -1 });

        res.render('clients/detail', {
            title: `${client.name} | Client Details`,
            clientRecord: client,
            projects,
            payments,
            documents,
            activities,
            activePage: 'clients'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new client.
 */
const createClient = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, email, phone, company, rating, status, linkedin, twitter, instagram, whatsapp, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const client = new Client({
            userId,
            name,
            email: email || '',
            phone: phone || '',
            company: company || '',
            rating: Number(rating) || 5,
            status: status || 'active',
            notes: notes || '',
            socialMedia: {
                linkedin: linkedin || '',
                twitter: twitter || '',
                instagram: instagram || '',
                whatsapp: whatsapp || ''
            }
        });

        await client.save();

        // Create initial log activity
        const activity = new Activity({
            userId,
            clientId: client._id,
            type: 'general',
            description: `Client record created for '${client.name}'`
        });
        await activity.save();

        return res.json({ success: true, message: 'Client created successfully', client });
    } catch (err) {
        next(err);
    }
};

/**
 * Update an existing client.
 */
const updateClient = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, email, phone, company, rating, status, linkedin, twitter, instagram, whatsapp, notes } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const client = await Client.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        client.name = name;
        client.email = email || '';
        client.phone = phone || '';
        client.company = company || '';
        client.rating = Number(rating) || 5;
        client.status = status || 'active';
        client.notes = notes || '';
        client.socialMedia = {
            linkedin: linkedin || '',
            twitter: twitter || '',
            instagram: instagram || '',
            whatsapp: whatsapp || ''
        };

        await client.save();

        // Log activity
        const activity = new Activity({
            userId,
            clientId: client._id,
            type: 'general',
            description: `Updated client profile information`
        });
        await activity.save();

        return res.json({ success: true, message: 'Client updated successfully', client });
    } catch (err) {
        next(err);
    }
};

/**
 * Delete a client (soft delete).
 */
const deleteClient = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const client = await Client.findOne({ _id: req.params.id, userId, isDeleted: false });

        if (!client) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        client.isDeleted = true;
        await client.save();

        // Soft delete all dependent data
        await Project.updateMany({ clientId: client._id, userId }, { isDeleted: true });
        await Payment.updateMany({ clientId: client._id, userId }, { isDeleted: true });
        await Document.updateMany({ clientId: client._id, userId }, { isDeleted: true });

        return res.json({ success: true, message: 'Client and associated resources deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Add a project to a client.
 */
const addProject = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const clientId = req.params.id;
        const { name, value, status, startDate, endDate, description } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Project name is required' });
        }

        const project = new Project({
            userId,
            clientId,
            name,
            value: Number(value) || 0,
            status: status || 'planning',
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            description: description || ''
        });

        await project.save();

        // Log activity
        const formattedValue = Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        const activity = new Activity({
            userId,
            clientId,
            type: 'project',
            description: `New project added: '${name}' (Budget: ${formattedValue})`
        });
        await activity.save();

        return res.json({ success: true, message: 'Project added successfully', project });
    } catch (err) {
        next(err);
    }
};

/**
 * Add a payment/invoice to a client.
 */
const addPayment = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const clientId = req.params.id;
        const { amount, invoiceNumber, status, dueDate, paidDate, projectId } = req.body;

        if (!amount || !invoiceNumber || !dueDate) {
            return res.status(400).json({ success: false, message: 'Amount, Invoice Number, and Due Date are required' });
        }

        const payment = new Payment({
            userId,
            clientId,
            projectId: projectId || undefined,
            amount: Number(amount),
            invoiceNumber,
            status: status || 'pending',
            dueDate: new Date(dueDate),
            paidDate: paidDate ? new Date(paidDate) : undefined
        });

        await payment.save();

        // Log activity
        const formattedAmount = Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
        const activity = new Activity({
            userId,
            clientId,
            type: 'payment',
            description: `Invoice #${invoiceNumber} issued for ${formattedAmount} (Status: ${status.replace('_', ' ')})`
        });
        await activity.save();

        return res.json({ success: true, message: 'Payment recorded successfully', payment });
    } catch (err) {
        next(err);
    }
};

/**
 * Add a document mapping to a client.
 */
const addDocument = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const clientId = req.params.id;
        const { name, fileUrl, fileSize, fileType } = req.body;

        if (!name || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Document name and file link are required' });
        }

        const doc = new Document({
            userId,
            clientId,
            name,
            fileUrl,
            fileSize: fileSize || '1.2 MB',
            fileType: fileType || 'PDF'
        });

        await doc.save();

        // Log activity
        const activity = new Activity({
            userId,
            clientId,
            type: 'document',
            description: `Uploaded document: '${name}'`
        });
        await activity.save();

        return res.json({ success: true, message: 'Document added successfully', document: doc });
    } catch (err) {
        next(err);
    }
};

/**
 * Log a sent email.
 */
const logEmail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const clientId = req.params.id;
        const { subject, body } = req.body;

        if (!subject || !body) {
            return res.status(400).json({ success: false, message: 'Subject and message body are required' });
        }

        // We record emails inside the Activity timeline
        const activity = new Activity({
            userId,
            clientId,
            type: 'email',
            description: `Sent Email: "${subject}"\n\n${body}`
        });
        await activity.save();

        return res.json({ success: true, message: 'Email logged successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Log custom interaction/note activity in timeline.
 */
const logActivity = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const clientId = req.params.id;
        const { type, description } = req.body;

        if (!description) {
            return res.status(400).json({ success: false, message: 'Description is required' });
        }

        const activity = new Activity({
            userId,
            clientId,
            type: type || 'general',
            description
        });
        await activity.save();

        return res.json({ success: true, message: 'Activity logged successfully', activity });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getClients,
    getClientDetail,
    createClient,
    updateClient,
    deleteClient,
    addProject,
    addPayment,
    addDocument,
    logEmail,
    logActivity
};
