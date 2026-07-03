const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const emailController = require('../controllers/email.controller');
const upload = require('../middleware/upload');

// All email routes require authentication
router.use(isAuthenticated);

router.get('/', emailController.getDashboard);
router.post('/send', upload.memory.array('attachments', 5), emailController.sendEmail);
router.get('/:id', emailController.getDetail);

module.exports = router;
