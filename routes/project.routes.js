const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { isAuthenticated } = require('../middleware/auth');

// Projects listing & CRUD
router.get('/projects', isAuthenticated, projectController.getProjects);
router.get('/projects/:id', isAuthenticated, projectController.getProjectDetail);
router.post('/projects', isAuthenticated, projectController.createProject);
router.put('/projects/:id', isAuthenticated, projectController.updateProject);
router.delete('/projects/:id', isAuthenticated, projectController.deleteProject);

// Checklist toggle API
router.put('/projects/:id/checklist/toggle', isAuthenticated, projectController.toggleChecklist);

// Tasks Tab Actions
router.post('/projects/:id/tasks', isAuthenticated, projectController.addTask);
router.put('/projects/:id/tasks/:taskId/toggle', isAuthenticated, projectController.toggleTask);

// Payments Tab Actions
router.post('/projects/:id/payments', isAuthenticated, projectController.addProjectPayment);

// Documents Tab Actions
router.post('/projects/:id/documents', isAuthenticated, projectController.addProjectDocument);

// Manual Activity Log Tab Action
router.post('/projects/:id/activities', isAuthenticated, projectController.logProjectActivity);

module.exports = router;
