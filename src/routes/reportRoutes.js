const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateReportGeneration } = require('../middleware/validation');

// All staff report endpoints require authentication
router.use(authenticate);

// List all reports with filtering
router.get('/', reportController.listReports);

// Doctor stage reports pending clinical approval (Stage 3)
router.get(
  '/pending-doctor-approval',
  authorize('doctor', 'admin'),
  reportController.getDoctorPendingReports
);

// Get full report by internal report ID
router.get('/:id', reportController.getReportById);


// Generate report (creates barcode + unguessable QR token)
router.post(
  '/generate',
  authorize('lab-tech', 'admin'),
  validate(validateReportGeneration),
  reportController.generateReport
);

// Record print timestamp when physical print is triggered
router.post('/:id/print', reportController.markReportPrinted);

// Doctor approval / sign-off / rejection
router.post(
  '/:id/approve',
  authorize('doctor', 'admin'),
  reportController.doctorApproval
);

// Cancel report / sample (soft delete)
router.post(
  '/:id/cancel',
  authorize('front-desk', 'lab-tech', 'admin'),
  reportController.cancelReport
);

module.exports = router;
