/**
 * Login Rate Limiter Middleware
 * 
 * Provides brute-force protection for the login endpoint without
 * requiring the express-rate-limit package. Uses an in-memory store
 * keyed by IP address.
 * 
 * Config:
 *   - windowMs:   Time window in milliseconds (default: 15 minutes)
 *   - maxAttempts: Max failed attempts per window (default: 5)
 */

const failedAttempts = new Map(); // key: IP, value: { count, firstAttempt }

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

// Periodic cleanup of expired entries to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of failedAttempts) {
        if (now - data.firstAttempt > LOGIN_WINDOW_MS) {
            failedAttempts.delete(ip);
        }
    }
}, 60 * 1000); // cleanup every 60 seconds

/**
 * Middleware that blocks login attempts after too many failures.
 * Attaches a `recordFailedLogin` helper to `req` for the controller to call on auth failure.
 * Automatically clears the counter on successful login (when the request proceeds without calling recordFailedLogin).
 */
const loginRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = failedAttempts.get(ip);

    // Check if this IP is currently locked out
    if (record) {
        // Reset window if it has expired
        if (now - record.firstAttempt > LOGIN_WINDOW_MS) {
            failedAttempts.delete(ip);
        } else if (record.count >= MAX_ATTEMPTS) {
            const remainingMs = LOGIN_WINDOW_MS - (now - record.firstAttempt);
            const remainingMins = Math.ceil(remainingMs / 60000);
            return res.render('auth/login', {
                title: 'Sign In | Client Workspace',
                errors: {},
                username: req.body.username || '',
                alert: { 
                    type: 'danger', 
                    message: `Too many failed login attempts. Please try again in ${remainingMins} minute${remainingMins !== 1 ? 's' : ''}.` 
                }
            });
        }
    }

    // Attach helper for the auth controller to call on failed login
    req.recordFailedLogin = () => {
        const existing = failedAttempts.get(ip);
        if (existing && (now - existing.firstAttempt <= LOGIN_WINDOW_MS)) {
            existing.count += 1;
        } else {
            failedAttempts.set(ip, { count: 1, firstAttempt: now });
        }
    };

    // Attach helper to clear failed attempts on successful login
    req.clearFailedLogins = () => {
        failedAttempts.delete(ip);
    };

    next();
};

module.exports = { loginRateLimiter };
