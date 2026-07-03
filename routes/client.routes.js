const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { isAuthenticated } = require('../middleware/auth');

// Protect all client routes
router.get('/clients', isAuthenticated, clientController.getClients);
router.get('/clients/:id', isAuthenticated, clientController.getClientDetail);
router.post('/clients', isAuthenticated, clientController.createClient);
router.put('/clients/:id', isAuthenticated, clientController.updateClient);
router.delete('/clients/:id', isAuthenticated, clientController.deleteClient);

// Client sub-resources routes
router.post('/clients/:id/projects', isAuthenticated, clientController.addProject);
router.post('/clients/:id/payments', isAuthenticated, clientController.addPayment);
router.post('/clients/:id/documents', isAuthenticated, clientController.addDocument);
router.post('/clients/:id/emails', isAuthenticated, clientController.logEmail);
router.post('/clients/:id/activities', isAuthenticated, clientController.logActivity);

module.exports = router;
