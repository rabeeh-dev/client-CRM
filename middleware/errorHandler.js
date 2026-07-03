const logger = require('../utils/logger');

/**
 * Global Error Handling Middleware.
 */
const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    const statusCode = err.statusCode || 500;
    
    // In production, keep message generic to prevent exposing internals
    const message = process.env.NODE_ENV === 'production' 
        ? 'Something went wrong on the server' 
        : err.message;

    if (statusCode === 401 || statusCode === 403) {
        return res.status(statusCode).render('errors/401', {
            title: 'Unauthorized Access | Client Workspace',
            code: statusCode,
            message: message
        });
    }

    res.status(statusCode).render('errors/500', {
        title: 'Server Error | Client Workspace',
        message: message,
        error: process.env.NODE_ENV === 'production' ? {} : err
    });
};

module.exports = errorHandler;
