const Project = require('../models/Project');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const Lead = require('../models/Lead');

// Render Calendar Workspace
exports.getCalendar = async (req, res, next) => {
    try {
        const userId = req.session.userId;
        const view = req.query.view || 'month'; // 'month' or 'week'
        
        // Parse date query parameter (default to current date)
        let activeDate = new Date();
        if (req.query.date) {
            const parsed = new Date(req.query.date);
            if (!isNaN(parsed.getTime())) {
                activeDate = parsed;
            }
        }

        const year = activeDate.getFullYear();
        const month = activeDate.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Gather all calendar events from database models
        const events = [];

        // --- FETCH MEETINGS ---
        // Source A: Client Meetings (Activities)
        const clientMeetings = await Activity.find({ userId, type: 'meeting' })
            .populate('clientId', 'name');
            
        clientMeetings.forEach(act => {
            if (act.date) {
                events.push({
                    id: act._id,
                    type: 'meeting',
                    title: `Meeting: ${act.clientId ? act.clientId.name : 'Client'}`,
                    description: act.description,
                    date: act.date,
                    time: act.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    link: act.clientId ? `/clients/${act.clientId._id}` : '/clients',
                    status: 'completed'
                });
            }
        });

        // Source B: Lead Meetings (Interactions)
        const leads = await Lead.find({ userId, isDeleted: false });
        leads.forEach(lead => {
            // Check interactions for meetings
            lead.interactions.forEach(inter => {
                if (inter.type === 'meeting' && inter.date) {
                    events.push({
                        id: inter._id,
                        type: 'meeting',
                        title: `Meeting: ${lead.name}`,
                        description: inter.description,
                        date: inter.date,
                        time: inter.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                        link: `/leads/${lead._id}`,
                        status: 'completed'
                    });
                }
            });

            // --- FETCH FOLLOW-UPS ---
            lead.followUps.forEach(follow => {
                if (follow.date) {
                    events.push({
                        id: follow._id,
                        type: 'followup',
                        title: `Follow-up: ${lead.name}`,
                        description: follow.note || 'No notes logged.',
                        date: follow.date,
                        time: follow.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                        link: `/leads/${lead._id}`,
                        status: follow.isCompleted ? 'completed' : 'pending'
                    });
                }
            });
        });

        // --- FETCH PROJECT DEADLINES ---
        const projects = await Project.find({ userId, isDeleted: false, endDate: { $ne: null } })
            .populate('clientId', 'name');
            
        projects.forEach(proj => {
            events.push({
                id: proj._id,
                type: 'deadline',
                title: `Deadline: ${proj.name}`,
                description: `Project Deadline (${proj.clientId ? proj.clientId.name : 'General'})`,
                date: proj.endDate,
                time: '',
                link: `/projects/${proj._id}`,
                status: proj.status
            });
        });


        // --- FETCH TASKS ---
        const tasks = await Task.find({ userId, isDeleted: false, dueDate: { $ne: null } })
            .populate('projectId', 'name');
            
        tasks.forEach(task => {
            events.push({
                id: task._id,
                type: 'task',
                title: `Task: ${task.title}`,
                description: `Project Task (${task.projectId ? task.projectId.name : 'General'})`,
                date: task.dueDate,
                time: '',
                link: task.projectId ? `/projects/${task.projectId._id}` : '/tasks',
                status: task.status
            });
        });

        // Helper: Filter events for a given YYYY-MM-DD date string
        const getEventsForDate = (dateStr) => {
            return events.filter(e => {
                const eDateStr = e.date.toISOString().split('T')[0];
                return eDateStr === dateStr;
            }).sort((a, b) => a.date - b.date);
        };

        // Render variables setup
        let calendarTitle = '';
        let prevDateLink = '';
        let nextDateLink = '';
        let monthGrid = [];
        let weekDays = [];

        if (view === 'month') {
            // --- MONTH VIEW LOGIC ---
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            calendarTitle = `${monthNames[month]} ${year}`;

            // Calculation limits for grid cells
            const firstDayIndex = new Date(year, month, 1).getDay(); // index day (0 = Sun, 6 = Sat)
            const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
            const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

            // Nav links
            const prevMonthDate = new Date(year, month - 1, 1);
            const nextMonthDate = new Date(year, month + 1, 1);
            prevDateLink = `/calendar?view=month&date=${prevMonthDate.toISOString().split('T')[0]}`;
            nextDateLink = `/calendar?view=month&date=${nextMonthDate.toISOString().split('T')[0]}`;

            // Create 42 grid cells (6 rows * 7 days)
            let cellCount = 0;
            
            // 1. Add trailing days from previous month
            for (let i = firstDayIndex - 1; i >= 0; i--) {
                const dayNum = totalDaysInPrevMonth - i;
                const prevDate = new Date(year, month - 1, dayNum);
                const dStr = prevDate.toISOString().split('T')[0];
                monthGrid.push({
                    dayNumber: dayNum,
                    dateStr: dStr,
                    isPadding: true,
                    isToday: dStr === todayStr,
                    events: getEventsForDate(dStr)
                });
                cellCount++;
            }

            // 2. Add current month days
            for (let i = 1; i <= totalDaysInMonth; i++) {
                const currDate = new Date(year, month, i);
                const dStr = currDate.toISOString().split('T')[0];
                monthGrid.push({
                    dayNumber: i,
                    dateStr: dStr,
                    isPadding: false,
                    isToday: dStr === todayStr,
                    events: getEventsForDate(dStr)
                });
                cellCount++;
            }

            // 3. Add leading padding days from next month to fill grid (up to 42 cells)
            let nextMonthDay = 1;
            while (cellCount < 42) {
                const nextDate = new Date(year, month + 1, nextMonthDay);
                const dStr = nextDate.toISOString().split('T')[0];
                monthGrid.push({
                    dayNumber: nextMonthDay,
                    dateStr: dStr,
                    isPadding: true,
                    isToday: dStr === todayStr,
                    events: getEventsForDate(dStr)
                });
                nextMonthDay++;
                cellCount++;
            }

        } else {
            // --- WEEK VIEW LOGIC ---
            // Find Sunday of current active week
            const dayOfWeek = activeDate.getDay();
            const sundayDate = new Date(activeDate);
            sundayDate.setDate(activeDate.getDate() - dayOfWeek);

            // Nav links (7 days back and forward)
            const prevWeekDate = new Date(activeDate);
            prevWeekDate.setDate(activeDate.getDate() - 7);
            const nextWeekDate = new Date(activeDate);
            nextWeekDate.setDate(activeDate.getDate() + 7);

            prevDateLink = `/calendar?view=week&date=${prevWeekDate.toISOString().split('T')[0]}`;
            nextDateLink = `/calendar?view=week&date=${nextWeekDate.toISOString().split('T')[0]}`;

            // Title range
            const saturdayDate = new Date(sundayDate);
            saturdayDate.setDate(sundayDate.getDate() + 6);
            
            const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
            calendarTitle = `${formatter.format(sundayDate)} - ${formatter.format(saturdayDate)}, ${year}`;

            // Build 7 columns
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(sundayDate);
                dayDate.setDate(sundayDate.getDate() + i);
                const dStr = dayDate.toISOString().split('T')[0];

                weekDays.push({
                    name: dayNames[i],
                    dateLabel: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    dateStr: dStr,
                    isToday: dStr === todayStr,
                    events: getEventsForDate(dStr)
                });
            }
        }

        res.render('calendar/index', {
            title: 'Schedule Calendar | Client CRM',
            view,
            calendarTitle,
            prevDateLink,
            nextDateLink,
            monthGrid,
            weekDays,
            activeDateStr: activeDate.toISOString().split('T')[0],
            activePage: 'calendar'
        });
    } catch (err) {
        next(err);
    }
};
