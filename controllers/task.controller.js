const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');

// Render Kanban Task Board (Todo, In Progress, Completed columns)
exports.getTaskBoard = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { search, priority, projectId } = req.query;

        // Build query
        const query = { userId, isDeleted: false };

        if (priority) {
            query.priority = priority;
        }
        if (projectId) {
            query.projectId = projectId;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch all tasks matching query
        const tasks = await Task.find(query)
            .populate('projectId', 'name clientId')
            .sort({ updatedAt: -1 });

        // Segment tasks by status column
        const todoTasks = tasks.filter(t => t.status === 'todo');
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
        const completedTasks = tasks.filter(t => t.status === 'completed');

        // Fetch all active projects for client/project selectors in Add Task form & Filters
        const projects = await Project.find({ userId, isDeleted: false }).sort({ name: 1 });

        res.render('tasks/index', {
            title: 'Task Board | Client CRM',
            todoTasks,
            inProgressTasks,
            completedTasks,
            projects,
            filters: {
                search: search || '',
                priority: priority || '',
                projectId: projectId || ''
            },
            activePage: 'tasks'
        });
    } catch (err) {
        next(err);
    }
};

// Create a Task
exports.createTask = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { title, description, priority, deadline, projectId } = req.body;

        if (!title || !projectId) {
            return res.status(400).json({ success: false, message: 'Task title and project are required' });
        }

        const project = await Project.findOne({ _id: projectId, userId, isDeleted: false });
        if (!project) {
            return res.status(404).json({ success: false, message: 'Assigned project not found' });
        }

        const task = new Task({
            userId,
            projectId: project._id,
            title,
            description: description || '',
            priority: priority || 'medium',
            dueDate: deadline ? new Date(deadline) : undefined,
            status: 'todo'
        });
        await task.save();

        // Automatically log activity creation event
        const activity = new Activity({
            userId,
            clientId: project.clientId,
            projectId: project._id,
            type: 'project',
            description: `Task "${task.title}" added to project '${project.name}' (Priority: ${task.priority.toUpperCase()}).`
        });
        await activity.save();

        res.status(201).json({ success: true, message: 'Task created successfully', task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Update Task Details (Title, Description, Priority, Deadline, Status, Project)
exports.updateTask = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { title, description, priority, deadline, status, projectId } = req.body;

        const task = await Task.findOne({ _id: req.params.id, userId, isDeleted: false })
            .populate('projectId');
            
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Check if project is changing
        if (projectId && projectId !== task.projectId._id.toString()) {
            const newProject = await Project.findOne({ _id: projectId, userId, isDeleted: false });
            if (!newProject) {
                return res.status(404).json({ success: false, message: 'New assigned project not found' });
            }
            task.projectId = newProject._id;
        }

        task.title = title || task.title;
        task.description = description !== undefined ? description : task.description;
        task.priority = priority || task.priority;
        if (deadline !== undefined) {
            task.dueDate = deadline ? new Date(deadline) : undefined;
        }
        
        // Update status if present and valid
        if (status && ['todo', 'in_progress', 'completed'].includes(status)) {
            task.status = status;
        }

        await task.save();

        res.json({ success: true, message: 'Task updated successfully', task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Task (Soft Delete)
exports.deleteTask = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const task = await Task.findOne({ _id: req.params.id, userId, isDeleted: false });
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        task.isDeleted = true;
        await task.save();

        res.json({ success: true, message: `Task '${task.title}' removed successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Fast Update Status (Transition status columns via AJAX PUT)
exports.updateTaskStatus = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const { status } = req.body;

        if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status is required' });
        }

        const task = await Task.findOne({ _id: req.params.id, userId, isDeleted: false })
            .populate('projectId');
            
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const oldStatus = task.status;
        task.status = status;
        await task.save();

        // Log transition in client/project timeline activity
        const activity = new Activity({
            userId,
            clientId: task.projectId.clientId,
            projectId: task.projectId._id,
            type: 'project',
            description: `Task "${task.title}" status moved from ${oldStatus.toUpperCase()} to ${status.toUpperCase()}.`
        });
        await activity.save();

        res.json({ success: true, message: `Task moved to ${status.replace('_', ' ')}`, task });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
