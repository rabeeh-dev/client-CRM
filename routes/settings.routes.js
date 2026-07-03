const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/settings', isAuthenticated, settingsController.getSettings);

router.post('/settings', 
    isAuthenticated, 
    upload.memory.fields([
        { name: 'profilePhoto', maxCount: 1 },
        { name: 'companyLogo', maxCount: 1 }
    ]), 
    settingsController.updateSettings
);

module.exports = router;
