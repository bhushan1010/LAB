/**
 * Input validation helpers
 */

function validate(schemaFn) {
  return (req, res, next) => {
    const errors = schemaFn(req.body);
    if (errors && errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }
    next();
  };
}

const isUUID = (str) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

const validateLogin = (body) => {
  const errors = [];
  if (!body.username || typeof body.username !== 'string' || body.username.trim() === '') {
    errors.push('username is required');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.trim() === '') {
    errors.push('password is required');
  }
  return errors;
};

const validatePatient = (body) => {
  const errors = [];
  if (!body.full_name || typeof body.full_name !== 'string' || body.full_name.trim() === '') {
    errors.push('full_name is required');
  }
  if (!body.gender || !['M', 'F', 'Other'].includes(body.gender)) {
    errors.push("gender must be 'M', 'F', or 'Other'");
  }
  if (body.age_years !== undefined && (typeof body.age_years !== 'number' || body.age_years < 0)) {
    errors.push('age_years must be a non-negative number');
  }
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '') {
    const phoneStr = String(body.phone).trim();
    if (!/^\d+$/.test(phoneStr)) {
      errors.push('Phone must contain numeric digits only (no letters, symbols, spaces, or country code prefixes)');
    } else if (phoneStr.length !== 10) {
      errors.push('Phone number must be exactly 10 numeric digits');
    }
  }
  return errors;
};

const validateVisit = (body) => {
  const errors = [];
  if (!body.patient_id || !isUUID(body.patient_id)) {
    errors.push('patient_id is required and must be a valid UUID');
  }
  if (body.status && !['registered', 'collected', 'in-testing', 'completed', 'cancelled'].includes(body.status)) {
    errors.push('status must be one of: registered, collected, in-testing, completed, cancelled');
  }
  return errors;
};

const validateTestResult = (body) => {
  const errors = [];
  if (!body.visit_id || !isUUID(body.visit_id)) {
    errors.push('visit_id is required and must be a valid UUID');
  }
  if (!body.department || typeof body.department !== 'string' || body.department.trim() === '') {
    errors.push('department is required (e.g. DEPARTMENT OF BIOCHEMISTRY)');
  }
  if (!body.test_name || typeof body.test_name !== 'string' || body.test_name.trim() === '') {
    errors.push('test_name is required (e.g. Plasma Glucose - Random)');
  }
  if (body.result_value === undefined || body.result_value === null || String(body.result_value).trim() === '') {
    errors.push('result_value is required (e.g. 114, Negative, etc.)');
  }
  if (body.flag && !['NORMAL', 'HIGH', 'LOW', 'CRITICAL'].includes(body.flag)) {
    errors.push("flag must be one of: NORMAL, HIGH, LOW, CRITICAL or null");
  }
  return errors;
};

const validateReportGeneration = (body) => {
  const errors = [];
  if (!body.visit_id || !isUUID(body.visit_id)) {
    errors.push('visit_id is required and must be a valid UUID');
  }
  return errors;
};

module.exports = {
  validate,
  isUUID,
  validateLogin,
  validatePatient,
  validateVisit,
  validateTestResult,
  validateReportGeneration,
};
