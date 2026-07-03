const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { isAuthenticated } = require('../middleware/auth');

// Tasks listing and board columns transitions
router.get('/tasks', isAuthenticated, taskController.getTaskBoard);
router.post('/tasks', isAuthenticated, taskController.createTask);
router.put('/tasks/:id', isAuthenticated, taskController.updateTask);
router.delete('/tasks/:id', isAuthenticated, taskController.deleteTask);
router.put('/tasks/:id/status', isAuthenticated, taskController.updateTaskStatus);

module.exports = router;
