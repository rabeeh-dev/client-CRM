const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

router.use(isAuthenticated);
router.get('/analytics', analyticsController.getDashboard);

module.exports = router;
