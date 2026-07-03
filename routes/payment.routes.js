const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { isAuthenticated } = require('../middleware/auth');

// Payments routes list
router.get('/payments', isAuthenticated, paymentController.getPayments);
router.get('/payments/:id', isAuthenticated, paymentController.getPaymentDetail);
router.post('/payments', isAuthenticated, paymentController.createInvoice);
router.post('/payments/:id/transactions', isAuthenticated, paymentController.addTransaction);
router.delete('/payments/:id', isAuthenticated, paymentController.deleteInvoice);

module.exports = router;
