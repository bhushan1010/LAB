const app = require('./server');
const config = require('./config/env');
const { testConnection } = require('./db');

async function startServer() {
  console.log('====================================================');
  console.log('  Lab Report Management System API — Phase 1');
  console.log(`  Environment: ${config.env}`);
  console.log('====================================================');

  // Test DB connectivity
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠️  Warning: Unable to connect to PostgreSQL. Please check DB credentials in .env or run migrations.');
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 API Server successfully running on http://0.0.0.0:${config.port}`);
    console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
    console.log(`🔒 Public QR Endpoint: http://localhost:${config.port}/api/public/reports/:qr_token`);
    console.log(`🔄 Offline Sync Endpoint: http://localhost:${config.port}/api/sync/push`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = () => {
    console.log('\nReceived kill signal, shutting down gracefully...');
    server.close(() => {
      console.log('Closed out remaining connections.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

startServer();
