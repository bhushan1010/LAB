const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validatePatient } = require('../middleware/validation');

// All patient endpoints require authentication
router.use(authenticate);

// List & search patients (front-desk, lab-tech, admin)
router.get('/', patientController.listPatients);

// Get single patient with visits (front-desk, lab-tech, admin)
router.get('/:id', patientController.getPatientById);

// Create patient (front-desk, admin)
router.post('/', authorize('front-desk', 'admin'), validate(validatePatient), patientController.createPatient);

// Update patient (front-desk, admin)
router.put('/:id', authorize('front-desk', 'admin'), patientController.updatePatient);

// Delete patient (admin only)
router.delete('/:id', authorize('admin'), patientController.deletePatient);

module.exports = router;
