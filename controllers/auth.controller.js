const User = require('../models/User');
const bcrypt = require('bcrypt');
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
 * Authenticates against the hashed password stored in MongoDB using bcrypt.compare.
 * On first-ever login (empty DB), the admin user is bootstrapped from .env variables.
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

    const renderLoginError = () => {
        return res.render('auth/login', {
            title: 'Sign In | Client Workspace',
            errors: {},
            username,
            alert: { type: 'danger', message: 'Invalid username or password.' }
        });
    };

    try {
        // Look up the admin user in the database
        let user = await User.findOne({ role: 'admin' });

        if (!user) {
            // First-ever login: bootstrap the admin user from .env variables
            const envUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
            const envPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123';
            const envEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@clientworkspace.io';
            const envFirstName = process.env.DEFAULT_ADMIN_FIRST_NAME || 'System';
            const envLastName = process.env.DEFAULT_ADMIN_LAST_NAME || 'Administrator';

            // Verify against env before creating
            if (username.toLowerCase() !== envUsername.toLowerCase() || password !== envPassword) {
                if (req.recordFailedLogin) req.recordFailedLogin();
                return renderLoginError();
            }

            user = new User({
                firstName: envFirstName,
                lastName: envLastName,
                username: envUsername.toLowerCase(),
                email: envEmail.toLowerCase(),
                password: envPassword, // pre-save hook will hash this
                role: 'admin'
            });
            await user.save();
        } else {
            // Normal login: verify password against the stored bcrypt hash
            const isMatch = await user.comparePassword(password);
            if (!isMatch || username.toLowerCase() !== user.username) {
                if (req.recordFailedLogin) req.recordFailedLogin();
                return renderLoginError();
            }
        }

        // Authentication successful — clear any failed-attempt tracking for this IP
        if (req.clearFailedLogins) req.clearFailedLogins();

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
