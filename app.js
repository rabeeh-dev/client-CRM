const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const leadRoutes = require('./routes/lead.routes');
const clientRoutes = require('./routes/client.routes');
const projectRoutes = require('./routes/project.routes');
const taskRoutes = require('./routes/task.routes');
const calendarRoutes = require('./routes/calendar.routes');
const paymentRoutes = require('./routes/payment.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const settingsRoutes = require('./routes/settings.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy for secure session cookies in production (behind Nginx, AWS ELB, etc.)
app.set('trust proxy', 1);


// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Configure Session Middleware with MongoStore
app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'client_workspace_session_secret_2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/client-workspace',
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 14 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
    }
}));

// Global user local variable mapping
app.use(async (req, res, next) => {
    // Dynamically fetch user details from database if logged in
    if (req.session && req.session.userId) {
        try {
            const User = require('./models/User');
            const dbUser = await User.findById(req.session.userId);
            res.locals.user = dbUser || null;
        } catch (err) {
            console.error('Error fetching user for locals:', err);
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    
    // Dynamically calculate sidebar badge counts and notifications if logged in
    if (req.session && req.session.userId) {
        try {
            const Lead = require('./models/Lead');
            const Task = require('./models/Task');
            const Activity = require('./models/Activity');

            const activeLeadsCount = await Lead.countDocuments({
                userId: req.session.userId,
                isDeleted: false,
                status: { $nin: ['won', 'lost'] }
            });
            res.locals.sidebarMetrics = { activeLeadsCount };

            // Fetch Notifications (Tasks due within 3 days & Upcoming Meetings)
            const now = new Date();
            const inThreeDays = new Date();
            inThreeDays.setDate(now.getDate() + 3);

            const upcomingTasks = await Task.find({
                userId: req.session.userId,
                isDeleted: false,
                status: { $ne: 'completed' },
                dueDate: { $lte: inThreeDays }
            }).sort({ dueDate: 1 }).limit(5);

            const upcomingMeetings = await Activity.find({
                userId: req.session.userId,
                type: 'meeting',
                date: { $gte: new Date(now.setHours(0,0,0,0)), $lte: inThreeDays }
            }).sort({ date: 1 }).limit(5);

            let notifications = [];

            upcomingTasks.forEach(t => {
                const isOverdue = t.dueDate < new Date();
                notifications.push({
                    id: t._id,
                    title: `Task Due: ${t.title}`,
                    time: isOverdue ? 'Overdue' : new Date(t.dueDate).toLocaleDateString(),
                    link: t.projectId ? `/projects/${t.projectId}` : '/tasks',
                    icon: 'check-square',
                    date: t.dueDate,
                    isOverdue
                });
            });

            upcomingMeetings.forEach(m => {
                notifications.push({
                    id: m._id,
                    title: `Meeting: ${m.description.substring(0, 30)}...`,
                    time: new Date(m.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
                    link: m.clientId ? `/clients/${m.clientId}` : '/calendar',
                    icon: 'users',
                    date: m.date,
                    isOverdue: false
                });
            });

            // Sort mixed notifications by date
            notifications.sort((a, b) => a.date - b.date);
            res.locals.notifications = notifications.slice(0, 6);

        } catch (err) {
            console.error('Error fetching global counts/notifications:', err);
            res.locals.sidebarMetrics = { activeLeadsCount: 0 };
            res.locals.notifications = [];
        }
    } else {
        res.locals.sidebarMetrics = { activeLeadsCount: 0 };
        res.locals.notifications = [];
    }
    
    next();
});

// Mount Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', leadRoutes);
app.use('/', clientRoutes);
app.use('/', projectRoutes);
app.use('/', taskRoutes);
app.use('/', calendarRoutes);
app.use('/', paymentRoutes);
app.use('/', analyticsRoutes);
app.use('/', settingsRoutes);

// Root Redirect to Dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// 404 Not Found Handler
app.use((req, res, next) => {
    res.status(404).render('errors/404', { title: '404 - Page Not Found' });
});

// Central Error Handler
app.use(errorHandler);

module.exports = app;
