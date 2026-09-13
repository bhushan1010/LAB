const assert = require('assert');
const {
  generateQrToken,
  generateBarcodeValue,
  generateUhid,
  generateVisitCode,
  generateReportCode,
} = require('../src/utils/tokens');

console.log('--- Running Unit Tests for Security & Utility Generators ---');

// 1. QR Token Tests (Hard Security Requirement)
const token1 = generateQrToken();
const token2 = generateQrToken();

assert.strictEqual(typeof token1, 'string', 'QR token should be a string');
assert.strictEqual(token1.length, 64, 'QR token should be exactly 64 hex characters (256-bit entropy)');
assert.match(token1, /^[0-9a-f]{64}$/, 'QR token must be a valid hex string');
assert.notStrictEqual(token1, token2, 'Two generated QR tokens must not match (collision impossible)');
console.log('✓ QR Token Security: 64-character unguessable crypto token generated:', token1);

// 2. Barcode Value Tests
const barcode = generateBarcodeValue('F');
assert.strictEqual(typeof barcode, 'string');
assert.match(barcode, /^F\d{8}$/, 'Barcode must match prefix F followed by 8 digits (e.g. F00000001)');
console.log('✓ Barcode Value Generator:', barcode);

// 3. UHID Tests (New Format: {client_code}-{FirstInitial}{LastInitial}{YY}-{4 digits})
(async () => {
  // Default Walk-In test
  const defaultUhid = generateUhid();
  assert.strictEqual(typeof defaultUhid, 'string');
  assert.match(
    defaultUhid,
    /^WALK-[A-Z]{2}\d{2}-\d{4}$/,
    'Default UHID must match WALK-{Initials}{YY}-{4 digits} format'
  );
  console.log('✓ Default Walk-In Patient UHID Generator:', defaultUhid);

  // Clinic test: Patient "Priya Patel", referring clinic "0001", year 2026
  const clinicUhid = generateUhid('Priya Patel', '0001', 2026);
  assert.match(
    clinicUhid,
    /^0001-PP26-\d{4}$/,
    'Clinic UHID must match 0001-PP26-XXXX format'
  );
  console.log('✓ Clinic Patient UHID Generator (Priya Patel / 0001 / 2026):', clinicUhid);

  // Single name test: Patient "Anita" (first letter used twice: 'A' -> 'AA')
  const singleNameUhid = generateUhid('Anita', 'WALK', 2026);
  assert.match(
    singleNameUhid,
    /^WALK-AA26-\d{4}$/,
    'Single-name UHID must use first letter twice (Anita -> AA)'
  );
  console.log('✓ Single Name UHID Generator (Anita / WALK / 2026):', singleNameUhid);

  // 4. Collision Retry Test
  const { generateUniqueUhid } = require('../src/utils/tokens');
  let attemptCount = 0;
  const mockCollisionChecker = async (candidate) => {
    attemptCount++;
    if (attemptCount === 1) return true; // simulate duplicate collision on 1st attempt
    return false; // succeeds on 2nd attempt
  };

  const collisionResolvedUhid = await generateUniqueUhid(
    { full_name: 'Priya Patel', client_code: '0001', year: 2026 },
    mockCollisionChecker
  );
  assert.match(collisionResolvedUhid, /^0001-PP26-\d{4}$/);
  assert.strictEqual(attemptCount, 2, 'Collision retry loop should execute again upon collision');
  console.log('✓ Collision Retry Logic: Successfully regenerated fresh UHID on collision:', collisionResolvedUhid);

  // 5. Visit Code Tests
  const visitCode = generateVisitCode('MIND');
  assert.strictEqual(typeof visitCode, 'string');
  assert.match(visitCode, /^MIND\d{6}$/);
  console.log('✓ Visit Code Generator:', visitCode);

  // 6. Report Code Tests
  const reportCode = generateReportCode();
  assert.strictEqual(typeof reportCode, 'string');
  assert.match(reportCode, /^REP-\d{6}-\d{4}$/);
  console.log('✓ Report Code Generator:', reportCode);

  // 7. Test Middleware Validation
  const { validatePatient, validateVisit, validateTestResult } = require('../src/middleware/validation');

  // Invalid patient test (empty)
  const patientErrors = validatePatient({});
  assert.ok(patientErrors.length > 0, 'Empty patient body should fail validation');
  assert.ok(patientErrors.includes('full_name is required'));

  // Valid patient without phone
  const validPatientErrors = validatePatient({ full_name: 'Mr. RAHUL DEMO', gender: 'M' });
  assert.strictEqual(validPatientErrors.length, 0, 'Valid patient should pass');

  // Phone Validation Tests
  const phoneWithAlpha = validatePatient({ full_name: 'Rahul Demo', gender: 'M', phone: '98765abcd0' });
  assert.ok(phoneWithAlpha.some((e) => e.includes('numeric digits only')), 'Phone with letters should fail validation');

  const phoneShort = validatePatient({ full_name: 'Rahul Demo', gender: 'M', phone: '98765' });
  assert.ok(phoneShort.some((e) => e.includes('exactly 10 numeric digits')), 'Phone with <10 digits should fail validation');

  const phoneLong = validatePatient({ full_name: 'Rahul Demo', gender: 'M', phone: '9876543210123' });
  assert.ok(phoneLong.some((e) => e.includes('exactly 10 numeric digits')), 'Phone with >10 digits should fail validation');

  const phoneValid = validatePatient({ full_name: 'Rahul Demo', gender: 'M', phone: '9876543210' });
  assert.strictEqual(phoneValid.length, 0, 'Valid 10-digit phone should pass validation');
  console.log('✓ Phone Number Validation: Checked numeric-only, length, and error messaging');

  // Freeform test validation
  const testResultErrors = validateTestResult({
    visit_id: '123e4567-e89b-12d3-a456-426614174000',
    department: 'DEPARTMENT OF BIOCHEMISTRY',
    test_name: 'Plasma Glucose - Random',
    result_value: '114',
  });
  assert.strictEqual(testResultErrors.length, 0, 'Freeform test result should pass');

  console.log('✓ Validation Middleware Tests: Passed all assertions');
  console.log('\nAll unit test assertions passed successfully!');
})();
