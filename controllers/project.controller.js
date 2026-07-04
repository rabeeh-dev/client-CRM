const Project = require('../models/Project');
const Client = require('../models/Client');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Document = require('../models/Document');
const Activity = require('../models/Activity');

// List Projects (Roster with metric cards and search/filter)
exports.getProjects = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { search, status, priority, clientId } = req.query;

        // Build query
        const query = { userId, isDeleted: false };

        if (status) {
            query.status = status;
        }
        if (priority) {
            query.priority = priority;
        }
        if (clientId) {
            query.clientId = clientId;
        }

        // Search in project name or description
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch projects with populated Client details
        const projects = await Project.find(query)
            .populate('clientId', 'name company')
            .sort({ createdAt: -1 });

        // Calculate project metrics across all active projects (unfiltered, for the metrics summary cards)
        const allProjects = await Project.find({ userId, isDeleted: false });
        
        let totalBudget = 0;
        let activeProjectsCount = 0;
        let completedProjectsCount = 0;
        let onHoldProjectsCount = 0;

        allProjects.forEach(proj => {
            totalBudget += (proj.budget || proj.value || 0);
            if (proj.status === 'in_progress') activeProjectsCount++;
            else if (proj.status === 'completed') completedProjectsCount++;
            else if (proj.status === 'on_hold') onHoldProjectsCount++;
        });

        // Get list of clients for client dropdown list in Add Project form
        const clients = await Client.find({ userId, isDeleted: false }).sort({ name: 1 });

        res.render('projects/index', {
            title: 'Project Roster | Client CRM',
            projects,
            clients,
            metrics: {
                totalBudget,
                activeProjects: activeProjectsCount,
                completedProjects: completedProjectsCount,
                onHoldProjects: onHoldProjectsCount
            },
            filters: {
                search: search || '',
                status: status || '',
                priority: priority || '',
                clientId: clientId || ''
            },
            activePage: 'projects'
        });
    } catch (err) {
        next(err);
    }
};

// Fetch Project Details with tabs resources
exports.getProjectDetail = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false })
            .populate('clientId');

        if (!project) {
            const err = new Error('Project not found');
            err.statusCode = 404;
            throw err;
        }

        // Fetch child resources
        const tasks = await Task.find({ projectId: project._id, isDeleted: false }).sort({ createdAt: -1 });
        const payments = await Payment.find({ projectId: project._id, isDeleted: false }).sort({ paidDate: -1, createdAt: -1 });
        const documents = await Document.find({ projectId: project._id, isDeleted: false }).sort({ uploadedAt: -1 });
        const activities = await Activity.find({ projectId: project._id }).sort({ date: -1 });

        // Calculate billing progress metrics
        let totalPaid = 0;
        payments.filter(p => p.status === 'paid').forEach(p => {
            totalPaid += p.amount;
        });
        const projectBudget = project.budget || project.value || 0;
        const remainingBalance = Math.max(0, projectBudget - totalPaid);

        res.render('projects/detail', {
            title: `${project.name} | Project Workspace`,
            project,
            projectRecord: project, // alias for safety
            tasks,
            payments,
            documents,
            activities,
            totalPaid,
            remainingBalance,
            activePage: 'projects'
        });
    } catch (err) {
        next(err);
    }
};

// Create a Project
exports.createProject = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, clientId, budget, value, deadline, status, priority, description } = req.body;

        if (!name || !clientId) {
            return res.status(400).json({ success: false, message: 'Project name and client are required' });
        }

        const projectBudget = Number(budget !== undefined ? budget : (value !== undefined ? value : 0)) || 0;

        const project = new Project({
            userId,
            clientId,
            name,
            budget: projectBudget,
            value: projectBudget,
            startDate: new Date(),
            endDate: deadline ? new Date(deadline) : undefined,
            status: status || 'planning',
            priority: priority || 'medium',
            checklist: [
                { label: 'Homepage Design', completed: false },
                { label: 'Online Shop / E-Commerce', completed: false },
                { label: 'Admin Control Panel', completed: false },
                { label: 'QA Testing & Bug Fixes', completed: false },
                { label: 'Server Deployment', completed: false },
                { label: 'Project Delivery & Handoff', completed: false }
            ]
        });

        await project.save();

        // Automatically log activity creation event
        const client = await Client.findById(clientId);
        const clientName = client ? client.name : 'Unknown';

        const activity = new Activity({
            userId,
            clientId,
            projectId: project._id,
            type: 'project',
            description: `Project '${project.name}' created for client ${clientName} with budget of ${project.budget.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}.`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Project created successfully', project });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update a Project
exports.updateProject = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, clientId, budget, amountReceived, deadline, status, priority, description } = req.body;

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (name && name.trim()) {
            project.name = name.trim();
        }

        if (budget !== undefined && budget !== '') {
            project.budget = Number(budget) || 0;
            project.value = Number(budget) || 0;
        }

        if (amountReceived !== undefined && amountReceived !== '') {
            project.amountReceived = Number(amountReceived) || 0;
        }

        if (deadline && deadline.trim()) {
            const parsedDate = new Date(deadline);
            if (!isNaN(parsedDate.getTime())) {
                project.endDate = parsedDate;
            }
        } else if (deadline === '') {
            project.endDate = undefined;
        }

        if (status && ['planning', 'in_progress', 'completed', 'on_hold'].includes(status)) {
            project.status = status;
        }

        if (priority && ['low', 'medium', 'high'].includes(priority)) {
            project.priority = priority;
        }

        if (description !== undefined) {
            project.description = description.trim();
        }

        // Track changes for activity log
        const changes = [];
        if (name && name.trim() && project.name !== name.trim()) changes.push(`name to '${name.trim()}'`);
        if (status && project.status !== status) changes.push(`status to '${status.replace(/_/g, ' ')}'`);
        if (budget !== undefined && budget !== '' && project.budget !== Number(budget)) changes.push(`budget`);
        if (priority && project.priority !== priority) changes.push(`priority to '${priority}'`);

        await project.save();

        // Log activity if there were changes
        if (changes.length > 0) {
            const Activity = require('../models/Activity');
            const activity = new Activity({
                userId,
                projectId: project._id,
                clientId: project.clientId,
                type: 'general',
                description: `Project updated: ${changes.join(', ')}`
            });
            await activity.save();
        }

        res.json({ success: true, message: 'Project details updated successfully', project });
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Project (Soft Delete)
exports.deleteProject = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        project.isDeleted = true;
        await project.save();

        // Clean up linked tasks (soft delete)
        await Task.updateMany({ projectId: project._id }, { isDeleted: true });

        res.json({ success: true, message: `Project '${project.name}' deleted successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Toggle Checklist Item State (AJAX PUT call)
exports.toggleChecklist = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { milestoneId, completed } = req.body;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Find milestone subdocument
        const milestone = project.checklist.id(milestoneId);
        if (!milestone) {
            return res.status(404).json({ success: false, message: 'Milestone not found' });
        }

        milestone.completed = !!completed;

        // Recalculate progress percentage
        const totalCount = project.checklist.length;
        const completedCount = project.checklist.filter(item => item.completed).length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        project.progress = newProgress;

        // Auto transition status to completed if checklist progress reaches 100%
        if (newProgress === 100 && project.status !== 'completed') {
            project.status = 'completed';
        }

        await project.save();

        // Log to activity timeline
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'project',
            description: `Milestone '${milestone.label}' marked as ${completed ? 'completed' : 'incomplete'} (Project progress: ${newProgress}%).`
        });
        await activity.save();

        res.json({ 
            success: true, 
            message: `Milestone updated to ${completed ? 'completed' : 'incomplete'}`, 
            progress: newProgress,
            status: project.status
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add Task
exports.addTask = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { title, priority, dueDate } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Task title is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const task = new Task({
            userId,
            projectId: project._id,
            title,
            priority: priority || 'medium',
            dueDate: dueDate ? new Date(dueDate) : undefined,
            status: 'todo'
        });
        await task.save();

        // Log task creation to activity timeline
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'project',
            description: `Created project task: "${task.title}" (Priority: ${task.priority.toUpperCase()}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Task created successfully', task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Toggle Task Complete (AJAX PUT call)
exports.toggleTask = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { completed } = req.body;

        const task = await Task.findOne({ _id: req.params.taskId, userId, isDeleted: false })
            .populate('projectId');
            
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.status = completed ? 'completed' : 'todo';
        await task.save();

        // Log task toggle event to timeline
        const activity = new Activity({
            userId,
            clientId: task.projectId.clientId,
            projectId: task.projectId._id,
            type: 'project',
            description: `Task "${task.title}" marked as ${completed ? 'completed' : 'incomplete'}.`
        });
        await activity.save();

        res.json({ success: true, message: `Task status updated to ${task.status}`, task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add Project Payment Receipt
exports.addProjectPayment = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { amount, date, method, notes } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, message: 'Payment amount is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
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

        // Log to timeline
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'payment',
            description: `Recorded payment received of ₹${payment.amount.toLocaleString()} via ${method ? method.replace('_', ' ').toUpperCase() : 'BANK TRANSFER'} (Notes: ${notes || 'None'}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Payment recorded successfully', payment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add Project Document
exports.addProjectDocument = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { name, fileUrl, fileSize, fileType } = req.body;

        if (!name || !fileUrl) {
            return res.status(400).json({ success: false, message: 'Document name and file link URL are required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const document = new Document({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            name,
            fileUrl,
            fileSize: fileSize || '1.2 MB',
            fileType: fileType || 'PDF'
        });
        await document.save();

        // Log to timeline
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'document',
            description: `Uploaded document: "${document.name}" (${document.fileType} • ${document.fileSize}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Document registered successfully', document });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Log Manual Activity interaction
exports.logProjectActivity = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { type, description } = req.body;

        if (!description) {
            return res.status(400).json({ success: false, message: 'Activity description is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: type || 'general',
            description: description
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Activity interaction logged successfully', activity });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Add Custom Milestone
exports.addMilestone = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { label } = req.body;

        if (!label) {
            return res.status(400).json({ success: false, message: 'Milestone label is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        project.checklist.push({ label, completed: false });

        // Recalculate progress percentage
        const totalCount = project.checklist.length;
        const completedCount = project.checklist.filter(item => item.completed).length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        project.progress = newProgress;

        // Auto transition status to completed if checklist progress reaches 100%
        if (newProgress === 100 && project.status !== 'completed') {
            project.status = 'completed';
        }

        await project.save();

        // Log timeline activity
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'project',
            description: `Added new milestone '${label}' to project checklist (Project progress: ${newProgress}%).`
        });
        await activity.save();

        res.status(201).json({ 
            success: true, 
            message: `Milestone '${label}' added successfully`, 
            progress: newProgress,
            status: project.status,
            checklist: project.checklist
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Custom Milestone
exports.deleteMilestone = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { milestoneId } = req.body;

        if (!milestoneId) {
            return res.status(400).json({ success: false, message: 'Milestone ID is required' });
        }

        const project = await Project.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const milestone = project.checklist.id(milestoneId);
        const milestoneLabel = milestone ? milestone.label : 'Unknown';

        project.checklist = project.checklist.filter(item => item._id.toString() !== milestoneId);

        // Recalculate progress percentage
        const totalCount = project.checklist.length;
        const completedCount = project.checklist.filter(item => item.completed).length;
        const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        project.progress = newProgress;

        await project.save();

        // Log timeline activity
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'project',
            description: `Deleted milestone '${milestoneLabel}' from project checklist (Project progress: ${newProgress}%).`
        });
        await activity.save();

        res.json({ 
            success: true, 
            message: `Milestone deleted successfully`, 
            progress: newProgress,
            status: project.status,
            checklist: project.checklist
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
