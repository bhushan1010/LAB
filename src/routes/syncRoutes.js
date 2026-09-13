const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { authenticate } = require('../middleware/auth');

// Sync endpoints require staff authentication
router.use(authenticate);

// Client pushes locally created records (patients, visits, test results, reports)
router.post('/push', syncController.pushSync);

// Health check and sync status
router.get('/status', syncController.getSyncStatus);

module.exports = router;
