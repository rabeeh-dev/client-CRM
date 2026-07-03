const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Render the login page.
 */
const getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'Sign In | Client Workspace',
        errors: {},
        username: '',
        alert: null
    });
};

/**
 * Process the login request.
 * Authenticates directly against the environment variables as the source of truth,
 * then transparently synchronises the MongoDB User profile.
 */
const postLogin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = {};
        errors.array().forEach(err => {
            formattedErrors[err.path] = err.msg;
        });
        return res.render('auth/login', {
            title: 'Sign In | Client Workspace',
            errors: formattedErrors,
            username: req.body.username || '',
            alert: null
        });
    }

    const { username, password } = req.body;

    // Load credentials directly from .env variables
    const envUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const envPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';
    const envEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clientworkspace.io';
    const envFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'System';
    const envLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator';

    // Verify incoming parameters against env settings
    if (username.toLowerCase() !== envUsername.toLowerCase() || password !== envPassword) {
        return res.render('auth/login', {
            title: 'Sign In | Client Workspace',
            errors: {},
            username,
            alert: { type: 'danger', message: 'Invalid username or password.' }
        });
    }

    try {
        // Synchronise user metadata with MongoDB to maintain a consistent admin _id for database relationships
        let user = await User.findOne({ role: 'admin' });

        if (user) {
            // Update fields if credentials modified in env
            user.firstName = envFirstName;
            user.lastName = envLastName;
            user.username = envUsername.toLowerCase();
            user.email = envEmail.toLowerCase();
            user.password = envPassword; // Will trigger the Mongoose schema pre-save password hash
            await user.save();
        } else {
            // Create user profile if database is clean
            user = new User({
                firstName: envFirstName,
                lastName: envLastName,
                username: envUsername.toLowerCase(),
                email: envEmail.toLowerCase(),
                password: envPassword,
                role: 'admin'
            });
            await user.save();
        }

        // Establish session properties
        req.session.userId = user._id;
        req.session.user = {
            id: user._id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            role: user.role,
            profileImage: user.profileImage
        };

        // Persist session before redirect
        req.session.save((err) => {
            if (err) {
                return next(err);
            }
            res.redirect('/dashboard');
        });

    } catch (err) {
        next(err);
    }
};

/**
 * Logout user and destroy session.
 */
const logout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            return next(err);
        }
        res.clearCookie('sid');
        res.redirect('/login');
    });
};

module.exports = {
    getLogin,
    postLogin,
    logout
};
