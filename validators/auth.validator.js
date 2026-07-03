const { body } = require('express-validator');

const loginValidator = [
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isAlphanumeric().withMessage('Username can only contain alphanumeric characters'),
    body('password')
        .notEmpty().withMessage('Password is required')
];

module.exports = {
    loginValidator
};
