const Lead = require('../models/Lead');

/**
 * Get leads index list page from MongoDB.
 */
const getLeads = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { search, priority, source } = req.query;

        // Build base query object partitioned by tenant (userId)
        const query = {
            userId,
            isDeleted: false
        };

        // Appending filters if declared
        if (priority && priority !== 'all') {
            query.priority = priority;
        }
        if (source && source !== 'all') {
            query.source = source;
        }
        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { name: regex },
                { company: regex },
                { email: regex }
            ];
        }

        // Fetch leads from MongoDB
        const leads = await Lead.find(query).sort({ createdAt: -1 });

        // Compute metrics for active pipeline value
        const pipelineQuery = { 
            userId, 
            isDeleted: false, 
            status: { $nin: ['won', 'lost'] } 
        };
        if (priority && priority !== 'all') pipelineQuery.priority = priority;
        if (source && source !== 'all') pipelineQuery.source = source;
        if (search) {
            const regex = new RegExp(search, 'i');
            pipelineQuery.$or = [
                { name: regex },
                { company: regex },
                { email: regex }
            ];
        }

        const pipelineLeads = await Lead.find(pipelineQuery);
        const totalPipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

        // Compute metrics for lead conversion rate
        const conversionQuery = { 
            userId, 
            isDeleted: false, 
            status: { $in: ['won', 'lost'] } 
        };
        if (priority && priority !== 'all') conversionQuery.priority = priority;
        if (source && source !== 'all') conversionQuery.source = source;
        if (search) {
            const regex = new RegExp(search, 'i');
            conversionQuery.$or = [
                { name: regex },
                { company: regex },
                { email: regex }
            ];
        }
        const finishedLeads = await Lead.find(conversionQuery);
        const wonCount = finishedLeads.filter(l => l.status === 'won').length;
        const conversionRate = finishedLeads.length > 0 ? Math.round((wonCount / finishedLeads.length) * 100) : 0;

        // Count active opportunities matching filters
        const activeCountQuery = {
            userId,
            isDeleted: false,
            status: { $nin: ['won', 'lost'] }
        };
        if (priority && priority !== 'all') activeCountQuery.priority = priority;
        if (source && source !== 'all') activeCountQuery.source = source;
        if (search) {
            const regex = new RegExp(search, 'i');
            activeCountQuery.$or = [
                { name: regex },
                { company: regex },
                { email: regex }
            ];
        }
        const activeCount = await Lead.countDocuments(activeCountQuery);

        res.render('leads/index', {
            title: 'Leads Pipeline | Client Workspace',
            leads,
            metrics: {
                pipelineValue: totalPipelineValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
                conversionRate,
                activeCount
            },
            filters: {
                search: search || '',
                priority: priority || 'all',
                source: source || 'all'
            },
            activePage: 'leads'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get specific lead detail page.
 */
const getLeadDetail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const lead = await Lead.findOne({ _id: req.params.id, userId, isDeleted: false });

        if (!lead) {
            return res.status(404).render('errors/500', {
                title: 'Lead Not Found',
                message: 'The requested lead record does not exist or has been deleted.',
                error: {}
            });
        }

        res.render('leads/detail', {
            title: `${lead.name} | Lead Details`,
            lead,
            activePage: 'leads'
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new lead in MongoDB.
 */
const createLead = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, email, phone, company, source, estimatedValue, priority, notes, linkedin, twitter, instagram, whatsapp, followup } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const leadData = {
            userId,
            name,
            email: email || '',
            phone: phone || '',
            company: company || '',
            source: source || 'other',
            status: 'new',
            estimatedValue: Number(estimatedValue) || 0,
            priority: priority || 'medium',
            notes: notes || '',
            socialMedia: {
                linkedin: linkedin || '',
                twitter: twitter || '',
                instagram: instagram || '',
                whatsapp: whatsapp || ''
            },
            interactions: [],
            followUps: followup ? [{ date: new Date(followup), note: 'Initial follow-up', isCompleted: false }] : []
        };

        const newLead = new Lead(leadData);
        await newLead.save();

        return res.json({ success: true, message: 'Lead created successfully', lead: newLead });
    } catch (err) {
        next(err);
    }
};

/**
 * Soft delete a lead from MongoDB.
 */
const deleteLead = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const lead = await Lead.findOne({ _id: req.params.id, userId, isDeleted: false });

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        lead.isDeleted = true;
        lead.deletedAt = new Date();
        await lead.save();

        return res.json({ success: true, message: 'Lead deleted successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Log a new interaction on a lead in MongoDB.
 */
const logInteraction = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { type, description, date } = req.body;

        if (!type || !description) {
            return res.status(400).json({ success: false, message: 'Type and description are required' });
        }

        const lead = await Lead.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        lead.interactions.unshift({
            type,
            description,
            date: date ? new Date(date) : new Date()
        });
        await lead.save();

        return res.json({ success: true, message: 'Interaction logged successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Add a new follow-up reminder to a lead in MongoDB.
 */
const addFollowUp = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { note, date } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const lead = await Lead.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        lead.followUps.unshift({
            note: note || 'Follow-up reminder',
            date: new Date(date),
            isCompleted: false
        });
        await lead.save();

        return res.json({ success: true, message: 'Follow-up scheduled successfully' });
    } catch (err) {
        next(err);
    }
};

/**
 * Update lead information in MongoDB.
 */
const updateLead = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, email, phone, company, source, status, priority, estimatedValue, notes, linkedin, twitter, instagram, whatsapp } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const lead = await Lead.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        const wasNotWon = lead.status !== 'won';

        // Update properties
        lead.name = name;
        lead.email = email || '';
        lead.phone = phone || '';
        lead.company = company || '';
        lead.source = source || 'other';
        lead.status = status || 'new';
        lead.estimatedValue = Number(estimatedValue) || 0;
        lead.priority = priority || 'medium';
        lead.notes = notes || '';
        lead.socialMedia = {
            linkedin: linkedin || '',
            twitter: twitter || '',
            instagram: instagram || '',
            whatsapp: whatsapp || ''
        };

        await lead.save();

        if (wasNotWon && status === 'won') {
            const Client = require('../models/Client');
            const newClient = new Client({
                userId,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                company: lead.company,
                status: 'active',
                notes: lead.notes,
                socialMedia: lead.socialMedia
            });
            await newClient.save();

            const Activity = require('../models/Activity');
            const activity = new Activity({
                userId,
                clientId: newClient._id,
                type: 'general',
                description: `Client automatically created from won lead in pipeline.`
            });
            await activity.save();
        }

        return res.json({ success: true, message: 'Lead details updated successfully', lead });
    } catch (err) {
        next(err);
    }
};

/**
 * Toggle the completion status of a follow-up reminder.
 */
const toggleFollowUp = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { id, followupId } = req.params;
        const { isCompleted } = req.body;

        const lead = await Lead.findOne({ _id: id, userId, isDeleted: false });
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        const followUp = lead.followUps.id(followupId);
        if (!followUp) {
            return res.status(404).json({ success: false, message: 'Follow-up not found' });
        }

        followUp.isCompleted = !!isCompleted;
        await lead.save();

        return res.json({ success: true, message: 'Follow-up status updated successfully', followUp });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getLeads,
    getLeadDetail,
    deleteLead,
    createLead,
    logInteraction,
    addFollowUp,
    toggleFollowUp,
    updateLead
};
