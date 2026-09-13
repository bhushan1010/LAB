const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateVisit } = require('../middleware/validation');

// All visit endpoints require authentication
router.use(authenticate);

// List & filter visits (front-desk, lab-tech, admin)
router.get('/', visitController.listVisits);

// List referring clinics with active client accounts
router.get('/referring-clinics', visitController.listReferringClinics);

// Get single visit with test results and report (front-desk, lab-tech, admin)
router.get('/:id', visitController.getVisitById);

// Create visit (front-desk, admin)
router.post('/', authorize('front-desk', 'admin'), validate(validateVisit), visitController.createVisit);

// Update visit status / doctor / details (front-desk, lab-tech, doctor, admin)
router.put('/:id', authorize('front-desk', 'lab-tech', 'doctor', 'admin'), visitController.updateVisit);

// Delete visit (admin only)
router.delete('/:id', authorize('admin'), visitController.deleteVisit);

module.exports = router;
