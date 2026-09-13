const crypto = require('crypto');

/**
 * Generate a long, cryptographically unguessable random token for public QR code report viewing.
 * Returns a 64-character hexadecimal string with 256 bits of entropy.
 */
function generateQrToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a barcode string for a sample tube or visit.
 * Format: Letter prefix (e.g. 'F') + 8 digits, e.g., 'F00000001'
 */
function generateBarcodeValue(prefix = 'F') {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${randomNum}`;
}

/**
 * Extract 2 uppercase initials from a patient full name.
 * Splits on first space. If only one name is given, uses first letter twice (e.g. "Anita" -> "AA").
 * If empty/missing, falls back to 'XX'.
 */
function extractInitials(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'XX';

  // Strip common salutations (Mr., Mrs., Ms., Dr., Master, Baby) if present
  let cleanName = fullName.trim().replace(/^(Mr|Mrs|Ms|Miss|Dr|Master|Baby)\.?\s+/i, '');
  if (!cleanName) cleanName = fullName.trim();

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'XX';

  if (parts.length === 1) {
    const char = parts[0][0]?.toUpperCase() || 'X';
    return `${char}${char}`;
  }

  const first = parts[0][0]?.toUpperCase() || 'X';
  const last = parts[parts.length - 1][0]?.toUpperCase() || 'X';
  return `${first}${last}`;
}

/**
 * Generate a human-readable Unique Healthcare / Medical Record ID (UHID).
 * Format: {client_code}-{FirstInitial}{LastInitial}{YY}-{4 random digits}
 * Example: 0001-PP26-4821 or WALK-AA26-8192
 */
function generateUhid(arg1 = 'Walk In', arg2 = null, arg3 = null) {
  let fullName = 'Walk In';
  let clientCode = 'WALK';
  let year = null;

  if (typeof arg1 === 'object' && arg1 !== null) {
    fullName = arg1.fullName || arg1.full_name || fullName;
    clientCode = arg1.clientCode || arg1.client_code || clientCode;
    year = arg1.year;
  } else if (typeof arg1 === 'string') {
    // If first arg looks like client code (short, no spaces) and second is full name
    if (arg2 && typeof arg2 === 'string' && arg2.includes(' ') && !arg1.includes(' ')) {
      clientCode = arg1;
      fullName = arg2;
      year = arg3;
    } else {
      fullName = arg1;
      if (arg2) clientCode = arg2;
      if (arg3) year = arg3;
    }
  }

  // Format client code (default 'WALK' if empty/unspecified)
  const cleanClientCode = clientCode && typeof clientCode === 'string' && clientCode.trim()
    ? clientCode.trim().toUpperCase()
    : 'WALK';

  // Format initials
  const initials = extractInitials(fullName);

  // Format 2-digit year (YY)
  const regYear = year ? String(year) : String(new Date().getFullYear());
  const yy = regYear.slice(-2);

  // 4 random digits (1000 - 9999)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);

  return `${cleanClientCode}-${initials}${yy}-${randomSuffix}`;
}

/**
 * Generate a unique UHID with collision retry loop.
 * Checks candidate against existingChecker function (e.g. database/store query).
 */
async function generateUniqueUhid(optionsOrName = {}, existingChecker = null, maxRetries = 10) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const candidate = generateUhid(optionsOrName);
    if (!existingChecker) {
      return candidate;
    }
    const exists = await existingChecker(candidate);
    if (!exists) {
      return candidate;
    }
  }
  return generateUhid(optionsOrName);
}

/**
 * Generate a human-readable Visit Code.
 * Format: MIND + 6 digits, e.g., MIND000001
 */
function generateVisitCode(prefix = 'MIND') {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
}

/**
 * Generate a Report Code.
 * Format: REP-YYYYMM-XXXX
 */
function generateReportCode() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REP-${yearMonth}-${randomSuffix}`;
}

module.exports = {
  generateQrToken,
  generateBarcodeValue,
  generateUhid,
  generateUniqueUhid,
  extractInitials,
  generateVisitCode,
  generateReportCode,
};
