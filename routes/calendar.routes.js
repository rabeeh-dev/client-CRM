const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { isAuthenticated } = require('../middleware/auth');

// Calendar Workspace Routes
router.get('/calendar', isAuthenticated, calendarController.getCalendar);

module.exports = router;
