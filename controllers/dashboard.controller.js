const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const mongoose = require('mongoose');

/**
 * Render the dashboard page with dynamic data from the database.
 */
const getDashboard = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const objectIdUser = new mongoose.Types.ObjectId(userId);

        const activeClients = await Client.countDocuments({ userId, status: 'active', isDeleted: false });
        const activeProjects = await Project.countDocuments({ userId, status: 'in_progress', isDeleted: false });

        const pendingPaymentsAgg = await Payment.aggregate([
            { $match: { userId: objectIdUser, status: { $in: ['pending', 'overdue'] }, isDeleted: false } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const pendingPaymentsAmount = pendingPaymentsAgg.length > 0 ? pendingPaymentsAgg[0].total : 0;
        const pendingPaymentsStr = pendingPaymentsAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

        const d = new Date();
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const revenueThisMonthAgg = await Payment.aggregate([
            { $match: { userId: objectIdUser, status: 'paid', isDeleted: false } },
            {
                $project: {
                    amount: 1,
                    revenueDate: { $ifNull: ["$paidDate", "$createdAt"] }
                }
            },
            { $match: { revenueDate: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenueThisMonthAmount = revenueThisMonthAgg.length > 0 ? revenueThisMonthAgg[0].total : 0;
        const revenueThisMonthStr = revenueThisMonthAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

        // Tasks due today
        const dbTasks = await Task.find({ 
            userId, 
            isDeleted: false, 
            status: { $ne: 'completed' },
            dueDate: { $gte: startOfToday, $lte: endOfToday }
        })
            .populate('projectId', 'name')
            .sort({ dueDate: 1 })
            .limit(5);

        const tasks = dbTasks.map(t => ({
            id: t._id,
            title: t.title,
            project: t.projectId ? t.projectId.name : 'General',
            priority: t.priority || 'medium',
            due: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date'
        }));

        // Activities
        const dbActivities = await Activity.find({ userId })
            .populate('clientId', 'name')
            .sort({ date: -1 })
            .limit(5);

        const iconMap = { project: 'folder', payment: 'credit-card', document: 'file-text', email: 'mail', call: 'phone', meeting: 'users', general: 'activity' };
        
        const activities = dbActivities.map(a => {
            const now = new Date();
            const diffMs = now - new Date(a.date);
            const diffMins = Math.max(0, Math.round(diffMs / 60000));
            const diffHours = Math.round(diffMins / 60);
            const diffDays = Math.round(diffHours / 24);
            
            let timeStr = 'Just now';
            if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins} mins ago`;
            else if (diffHours > 0 && diffHours < 24) timeStr = `${diffHours} hours ago`;
            else if (diffDays === 1) timeStr = 'Yesterday';
            else if (diffDays > 1) timeStr = `${diffDays} days ago`;

            return {
                id: a._id,
                icon: iconMap[a.type] || 'activity',
                action: (a.type || 'Activity').charAt(0).toUpperCase() + (a.type || 'Activity').slice(1),
                description: a.description,
                client: a.clientId ? a.clientId.name : 'System',
                time: timeStr
            };
        });

        // Deadlines (Projects nearing completion)
        const dbDeadlines = await Project.find({ userId, isDeleted: false, endDate: { $gte: startOfToday }, status: { $in: ['planning', 'in_progress'] } })
            .populate('clientId', 'name')
            .sort({ endDate: 1 })
            .limit(4);

        const deadlines = dbDeadlines.map(p => ({
            id: p._id,
            name: p.name,
            project: p.clientId ? p.clientId.name : 'General Client',
            date: new Date(p.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type: p.status === 'planning' ? 'design' : 'archive' 
        }));

        // Revenue Chart (last 6 months)
        const monthlyRevenueAgg = await Payment.aggregate([
            { $match: { userId: objectIdUser, status: 'paid', isDeleted: false } },
            {
                $project: {
                    amount: 1,
                    revenueDate: { $ifNull: ["$paidDate", "$createdAt"] }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$revenueDate" },
                        month: { $month: "$revenueDate" }
                    },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const chartLabels = [];
        const chartData = [];
        
        const dChart = new Date();
        dChart.setDate(1);
        dChart.setMonth(dChart.getMonth() - 5);
        for(let i=0; i<6; i++) {
            const y = dChart.getFullYear();
            const m = dChart.getMonth() + 1;
            chartLabels.push(months[m-1]);
            const match = monthlyRevenueAgg.find(x => x._id && x._id.year === y && x._id.month === m);
            chartData.push(match ? match.total : 0);
            dChart.setMonth(dChart.getMonth() + 1);
        }

        const newClientsThisMonth = await Client.countDocuments({ 
            userId, 
            isDeleted: false,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const twoWeeksFromNow = new Date();
        twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

        const projectsNearingCompletion = await Project.countDocuments({
            userId,
            isDeleted: false,
            status: { $in: ['planning', 'in_progress'] },
            endDate: { $gte: new Date(), $lte: twoWeeksFromNow }
        });

        const overduePaymentsCount = await Payment.countDocuments({
            userId,
            isDeleted: false,
            $or: [
                { status: 'overdue' },
                { status: 'pending', dueDate: { $lt: new Date() } }
            ]
        });

        const startOfLastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        const endOfLastMonth = new Date(d.getFullYear(), d.getMonth(), 0);

        const revenueLastMonthAgg = await Payment.aggregate([
            { $match: { userId: objectIdUser, status: 'paid', isDeleted: false } },
            {
                $project: {
                    amount: 1,
                    revenueDate: { $ifNull: ["$paidDate", "$createdAt"] }
                }
            },
            { $match: { revenueDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const revenueLastMonthAmount = revenueLastMonthAgg.length > 0 ? revenueLastMonthAgg[0].total : 0;

        let revenueGrowth = 0;
        if (revenueLastMonthAmount === 0 && revenueThisMonthAmount > 0) {
            revenueGrowth = 100;
        } else if (revenueLastMonthAmount > 0) {
            revenueGrowth = Math.round(((revenueThisMonthAmount - revenueLastMonthAmount) / revenueLastMonthAmount) * 100);
        }

        const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const lastMonthName = fullMonths[startOfLastMonth.getMonth()];

        const dashboardData = {
            activeClients,
            activeProjects,
            pendingPayments: pendingPaymentsStr,
            revenueThisMonth: revenueThisMonthStr,
            tasks,
            activities,
            deadlines,
            chartLabels,
            chartData,
            stats: {
                newClientsThisMonth,
                projectsNearingCompletion,
                overduePaymentsCount,
                revenueGrowth,
                lastMonthName
            }
        };

        res.render('dashboard/index', {
            title: 'Dashboard | Client Workspace',
            data: dashboardData,
            activePage: 'dashboard'
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        next(err);
    }
};

module.exports = {
    getDashboard
};
