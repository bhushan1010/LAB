const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// PUBLIC ENDPOINT (NO AUTHENTICATION)
// Secure access solely via long, unguessable cryptographic QR token
router.get('/reports/:qr_token', publicController.getReportByQrToken);

module.exports = router;
