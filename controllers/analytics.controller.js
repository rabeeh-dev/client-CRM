const Client = require('../models/Client');
const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Lead = require('../models/Lead');
const Task = require('../models/Task');
const mongoose = require('mongoose');

exports.getDashboard = async (req, res) => {
    try {
        const userId = req.session.userId;
        const objectIdUser = new mongoose.Types.ObjectId(userId);

        // Business Overview
        const totalClients = await Client.countDocuments({ userId, isDeleted: false });
        const totalProjects = await Project.countDocuments({ userId, isDeleted: false });
        const activeProjects = await Project.countDocuments({ userId, isDeleted: false, status: 'in_progress' });
        const completedProjects = await Project.countDocuments({ userId, isDeleted: false, status: 'completed' });
        const totalLeads = await Lead.countDocuments({ userId, isDeleted: false });

        const paidPayments = await Payment.find({ userId, status: 'paid', isDeleted: false });
        const totalRevenue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

        // Monthly Revenue (last 12 months)
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
        const monthlyLabels = [];
        const monthlyData = [];
        
        // Populate last 12 months
        const d = new Date();
        d.setDate(1); // Set to 1st to avoid end-of-month skipping issues
        d.setMonth(d.getMonth() - 11);
        for(let i=0; i<12; i++) {
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            monthlyLabels.push(months[m-1]);
            const match = monthlyRevenueAgg.find(x => x._id && x._id.year === y && x._id.month === m);
            monthlyData.push(match ? match.total : 0);
            d.setMonth(d.getMonth() + 1);
        }

        const monthlyRevenue = { labels: monthlyLabels, data: monthlyData };

        // Client Revenue (top 5)
        const clientRevenueAgg = await Payment.aggregate([
            { $match: { userId: objectIdUser, status: 'paid', isDeleted: false } },
            {
                $group: {
                    _id: "$clientId",
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "clients",
                    localField: "_id",
                    foreignField: "_id",
                    as: "client"
                }
            },
            { $unwind: "$client" }
        ]);
        const clientRevenue = {
            labels: clientRevenueAgg.map(c => c.client.name),
            data: clientRevenueAgg.map(c => c.total)
        };

        // Project Statistics
        const projectStatsAgg = await Project.aggregate([
            { $match: { userId: objectIdUser, isDeleted: false } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const projStatsMap = { planning: 0, in_progress: 0, completed: 0, on_hold: 0 };
        projectStatsAgg.forEach(p => {
            if (projStatsMap[p._id] !== undefined) projStatsMap[p._id] = p.count;
        });

        // Lead Conversion
        const leadStatsAgg = await Lead.aggregate([
            { $match: { userId: objectIdUser, isDeleted: false } },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
        const leadStatsMap = { new: 0, contacted: 0, proposal_sent: 0, negotiation: 0, won: 0, lost: 0 };
        leadStatsAgg.forEach(l => {
            if (leadStatsMap[l._id] !== undefined) leadStatsMap[l._id] = l.count;
        });
        const leadConversionRate = totalLeads > 0 ? Math.round((leadStatsMap.won / totalLeads) * 100) : 0;

        // Pending Payments
        const pendingPayments = await Payment.find({ userId, status: { $in: ['pending', 'overdue'] }, isDeleted: false })
            .populate('clientId', 'name')
            .populate('projectId', 'name')
            .sort({ dueDate: 1 })
            .limit(10);

        // Completed Projects
        const completedProjectsList = await Project.find({ userId, status: 'completed', isDeleted: false })
            .populate('clientId', 'name')
            .sort({ updatedAt: -1 })
            .limit(5);

        res.render('analytics/index', {
            title: 'Analytics',
            activePage: 'analytics',
            overview: {
                totalRevenue,
                totalClients,
                totalProjects,
                activeProjects,
                completedProjects,
                totalLeads
            },
            monthlyRevenue,
            clientRevenue,
            projectStats: projStatsMap,
            leadStats: leadStatsMap,
            leadConversionRate,
            pendingPayments,
            completedProjectsList
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).send('Server Error');
    }
};
