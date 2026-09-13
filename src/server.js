const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS setup (configured to accept LAN devices and remote clients)
app.use(cors({
  origin: '*', // In production VPS, configure to specific domains or internal LAN IPs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-client-device-id',
  ],
}));

// Request body parsers
app.use(express.json({ limit: '10mb' })); // Support offline batch sync payloads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root status & web app guide
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'LabTrack LIMS Backend API',
    status: 'online',
    frontend_ui_url: 'http://localhost:3000',
    health_check: '/api/health',
    message: 'Backend API is running. Access the user interface at http://localhost:3000',
  });
});

// Mount all API endpoints under /api
app.use('/api', apiRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint '${req.method} ${req.originalUrl}' not found`,
  });
});

// Global centralized error handler
app.use(errorHandler);

module.exports = app;
