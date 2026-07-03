const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { isAuthenticated } = require('../middleware/auth');

// Protect pipeline and detail routes
router.get('/leads', isAuthenticated, leadController.getLeads);
router.get('/leads/:id', isAuthenticated, leadController.getLeadDetail);
router.delete('/leads/:id', isAuthenticated, leadController.deleteLead);
router.post('/leads', isAuthenticated, leadController.createLead);
router.put('/leads/:id', isAuthenticated, leadController.updateLead);
router.post('/leads/:id/interactions', isAuthenticated, leadController.logInteraction);
router.post('/leads/:id/followups', isAuthenticated, leadController.addFollowUp);
router.put('/leads/:id/followups/:followupId/toggle', isAuthenticated, leadController.toggleFollowUp);

module.exports = router;
