const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateLogin } = require('../middleware/validation');

// Public login route
router.post('/login', validate(validateLogin), authController.login);

// Authenticated current user profile
router.get('/me', authenticate, authController.getProfile);

// Admin-only user management routes
router.post('/users', authenticate, authorize('admin'), authController.createUser);
router.get('/users', authenticate, authorize('admin'), authController.listUsers);
router.put('/users/:id', authenticate, authorize('admin'), authController.updateUser);

module.exports = router;
