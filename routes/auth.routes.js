const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { loginValidator } = require('../validators/auth.validator');

// Login GET and POST routes (restricted to guests only)
router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, loginValidator, authController.postLogin);

// Logout route (restricted to authenticated users only)
router.get('/logout', isAuthenticated, authController.logout);

module.exports = router;
