/**
 * Protect routes from unauthenticated users.
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        res.locals.user = req.session.user; // Expose session user to EJS templates
        return next();
    }
    return res.redirect('/login');
};

/**
 * Prevent authenticated users from accessing guest-only routes (like login).
 */
const isGuest = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    return next();
};

module.exports = {
    isAuthenticated,
    isGuest
};
