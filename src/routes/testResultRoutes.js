const express = require('express');
const router = express.Router();
const testResultController = require('../controllers/testResultController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateTestResult } = require('../middleware/validation');

// All test result endpoints require authentication
router.use(authenticate);

// List test results for a visit (all roles can view)
router.get('/', testResultController.listByVisit);

// Enter a single test result (lab-tech, admin)
router.post(
  '/',
  authorize('lab-tech', 'admin'),
  validate(validateTestResult),
  testResultController.createTestResult
);

// Bulk enter test results (lab-tech, admin)
router.post(
  '/bulk',
  authorize('lab-tech', 'admin'),
  testResultController.bulkCreateTestResults
);

// Update a test result (lab-tech, admin)
router.put(
  '/:id',
  authorize('lab-tech', 'admin'),
  testResultController.updateTestResult
);

// Delete a test result (lab-tech, admin)
router.delete(
  '/:id',
  authorize('lab-tech', 'admin'),
  testResultController.deleteTestResult
);

// Cancel a test result (soft delete with reason)
router.post(
  '/:id/cancel',
  authorize('front-desk', 'lab-tech', 'admin'),
  testResultController.cancelTestResult
);

module.exports = router;
