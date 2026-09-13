const { query } = require('../db');

/**
 * Log an audit event to the audit_logs table
 */
async function logAuditEvent({
  userId = null,
  clientDeviceId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await query(
      `INSERT INTO audit_logs (
        user_id, client_device_id, action, entity_type, entity_id, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        clientDeviceId,
        action,
        entityType,
        entityId ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent ? String(userAgent).slice(0, 255) : null,
      ]
    );
  } catch (err) {
    // Non-blocking: we log the failure to console so audit failure doesn't break the main transaction
    console.error('Audit logging error:', err.message);
  }
}

module.exports = {
  logAuditEvent,
};
