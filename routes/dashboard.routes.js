const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { isAuthenticated } = require('../middleware/auth');

// Protect dashboard route
router.get('/dashboard', isAuthenticated, dashboardController.getDashboard);

module.exports = router;
