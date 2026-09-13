const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const patientRoutes = require('./patientRoutes');
const visitRoutes = require('./visitRoutes');
const testResultRoutes = require('./testResultRoutes');
const reportRoutes = require('./reportRoutes');
const publicRoutes = require('./publicRoutes');
const syncRoutes = require('./syncRoutes');
const auditRoutes = require('./auditRoutes');

// Public route (no auth)
router.use('/public', publicRoutes);

// Protected routes
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/visits', visitRoutes);
router.use('/test-results', testResultRoutes);
router.use('/reports', reportRoutes);
router.use('/sync', syncRoutes);
router.use('/audit-logs', auditRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Lab Report Management System API',
  });
});

module.exports = router;
