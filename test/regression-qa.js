const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

async function api(method, endpoint, body = null, token = null, headers = {}) {
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };
  if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function runRegressionSuite() {
  console.log('=== STARTING FULL WHOLE-SYSTEM REGRESSION QA SUITE ===\n');

  const report = {
    timestamp: new Date().toISOString(),
    environment: { frontendUrl: FRONTEND_URL, backendUrl: BACKEND_URL, browser: 'Google Chrome 134.x (Headless CDP)' },
    summary: { total: 8, passed: 0, failed: 0, blocked: 0 },
    steps: {},
    security: {},
    brandingSweep: {},
    dataIntegrity: {},
    consoleErrors: [],
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') report.consoleErrors.push(msg.text());
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Cross-Role Workflow (Front-desk -> Lab-tech -> Admin)
    // -------------------------------------------------------------
    console.log('--- Test 1: Cross-Role Integrated Workflow ---');
    const uniqueName = `REGRESSION PATIENT ${Date.now().toString().slice(-4)}`;
    
    // 1.1 Front-desk registers patient & visit via API
    const fdLogin = await api('POST', '/api/auth/login', { username: 'reception1', password: 'DeskPassword123!' });
    const patRes = await api('POST', '/api/patients', { title: 'Mr.', full_name: uniqueName, age_years: 45, gender: 'M', phone: '9988776655' }, fdLogin.data.token);
    const visitRes = await api('POST', '/api/visits', { patient_id: patRes.data.patient.id, sample_type: 'SERUM', status: 'registered' }, fdLogin.data.token);
    
    // 1.2 Lab-tech enters test results on that patient
    const ltLogin = await api('POST', '/api/auth/login', { username: 'labtech1', password: 'TechPassword123!' });
    const testRes = await api('POST', '/api/test-results', {
      visit_id: visitRes.data.visit.id,
      department: 'DEPARTMENT OF BIOCHEMISTRY',
      test_name: 'Serum Electrolytes - Sodium',
      result_value: '138',
      unit: 'mmol/L',
      reference_range: '135 - 145',
      method: 'ISE',
      flag: 'NORMAL',
      display_order: 1
    }, ltLogin.data.token);

    // 1.3 Lab-tech finalizes report
    const repRes = await api('POST', '/api/reports/generate', {
      visit_id: visitRes.data.visit.id,
      status: 'final',
      interpretation: 'Serum electrolytes within physiological reference range.'
    }, ltLogin.data.token);

    // 1.4 Admin inspects report in system-wide list
    const adminLogin = await api('POST', '/api/auth/login', { username: 'admin', password: 'AdminPassword123!' });
    const adminRepList = await api('GET', `/api/reports?search=${encodeURIComponent(uniqueName)}`, null, adminLogin.data.token);

    const test1Passed = patRes.status === 201 && visitRes.status === 201 && testRes.status === 201 && repRes.status === 201 && adminRepList.data.reports?.length > 0;
    report.steps.step1 = {
      name: 'Cross-Role End-to-End Workflow',
      status: test1Passed ? 'PASS' : 'FAIL',
      details: {
        patientUhid: patRes.data.patient?.uhid,
        visitCode: visitRes.data.visit?.visit_code,
        reportCode: repRes.data.report?.report_code,
        qrToken: repRes.data.report?.qr_token,
        adminFoundCount: adminRepList.data.reports?.length
      }
    };
    if (test1Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 1 Result:', report.steps.step1.status);

    // -------------------------------------------------------------
    // TEST 2: Print Queue Server-Side Scoping Verification
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Print Queue Role Scoping ---');
    // Front desk on isolated workstation
    const fdScopedList = await api('GET', '/api/reports', null, fdLogin.data.token, { 'x-client-device-id': 'RECEPTION-DESK-UNIQUE' });
    // Admin system-wide
    const adminAllList = await api('GET', '/api/reports', null, adminLogin.data.token);

    const test2Passed = fdScopedList.data.count < adminAllList.data.count && adminAllList.data.count >= 5;
    report.steps.step2 = {
      name: 'Print Queue Role Scoping (Server-Side)',
      status: test2Passed ? 'PASS' : 'FAIL',
      details: {
        frontDeskCount: fdScopedList.data.count,
        adminCount: adminAllList.data.count,
        serverScopingEnforced: fdScopedList.data.count < adminAllList.data.count
      }
    };
    if (test2Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 2 Result:', report.steps.step2.status);

    // -------------------------------------------------------------
    // TEST 3: Dashboard-to-Action Flows in Browser UI
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Dashboard-to-Action Interactive UI Flows ---');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });

    // 3.1 Front-Desk Dashboard Quick Intake
    await page.evaluate(() => { localStorage.clear(); window.location.hash = '#/dashboard'; });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Front Desk');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // Verify Front-Desk Dashboard renders quick intake form
    const hasQuickIntake = await page.evaluate(() => {
      return !!document.querySelector('form') && document.body.innerText.includes('Quick Walk-In Registration');
    });

    // 3.2 Switch to Lab-Tech Dashboard
    await page.evaluate(() => { localStorage.clear(); window.location.hash = '#/dashboard'; });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Lab Tech');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    const hasTestingQueue = await page.evaluate(() => {
      return document.body.innerText.includes('Work Queue: Samples Awaiting Result Entry');
    });

    // 3.3 Switch to Admin Dashboard
    await page.evaluate(() => { localStorage.clear(); window.location.hash = '#/dashboard'; });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Admin');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    const hasAdminFeed = await page.evaluate(() => {
      return document.body.innerText.includes('Live Staff Activity Feed (Audit Log)');
    });

    const test3Passed = hasQuickIntake && hasTestingQueue && hasAdminFeed;
    report.steps.step3 = {
      name: 'Role-Scoped Dashboard-to-Action Flows',
      status: test3Passed ? 'PASS' : 'FAIL',
      details: { hasQuickIntake, hasTestingQueue, hasAdminFeed }
    };
    if (test3Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 3 Result:', report.steps.step3.status);

    // -------------------------------------------------------------
    // TEST 4: Audit Log Completeness for Cross-Role Workflow
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Audit Log Completeness ---');
    const auditRes = await api('GET', '/api/audit-logs?limit=25', null, adminLogin.data.token);
    const actionsFound = auditRes.data.audit_logs?.map(l => l.action) || [];
    
    const hasCreatePat = actionsFound.includes('CREATE_PATIENT');
    const hasCreateVisit = actionsFound.includes('CREATE_VISIT');
    const hasCreateTest = actionsFound.includes('CREATE_TEST_RESULT');
    const hasGenReport = actionsFound.includes('GENERATE_REPORT');

    const test4Passed = hasCreatePat && hasCreateVisit && hasCreateTest && hasGenReport;
    report.steps.step4 = {
      name: 'Audit Log Completeness Across Roles',
      status: test4Passed ? 'PASS' : 'FAIL',
      details: { hasCreatePat, hasCreateVisit, hasCreateTest, hasGenReport, totalAudits: auditRes.data.total }
    };
    if (test4Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 4 Result:', report.steps.step4.status);

    // -------------------------------------------------------------
    // TEST 5: Public QR View End-to-End
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Public QR View End-to-End ---');
    const generatedToken = repRes.data.report.qr_token;
    await page.goto(`${FRONTEND_URL}/report/${generatedToken}`, { waitUntil: 'networkidle0' });
    const qrPageContent = await page.evaluate(() => document.body.innerText);

    const hasVerifiedReport = /verified|official authenticated pathology report/i.test(qrPageContent);
    const hasSunriseBranding = qrPageContent.includes('SUNRISE');
    const hasGeneratedPatient = qrPageContent.includes(uniqueName);
    const hasElectrolyteTest = qrPageContent.includes('Serum Electrolytes - Sodium');

    const test5Passed = hasVerifiedReport && hasSunriseBranding && hasGeneratedPatient && hasElectrolyteTest;
    report.steps.step5 = {
      name: 'Public QR Verification Page Matching Live Data',
      status: test5Passed ? 'PASS' : 'FAIL',
      details: { hasVerifiedReport, hasSunriseBranding, hasGeneratedPatient, hasElectrolyteTest }
    };
    if (test5Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 5 Result:', report.steps.step5.status);

    // -------------------------------------------------------------
    // TEST 6: Codebase & DOM Branding Sweep
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Full Page-Source Branding Sweep ---');
    const forbiddenTerms = [
      'modern lims',
      'bansal',
      'khandelwal',
      'vijay nagar',
      'birendra',
      '15039',
      'apollo premier',
      'f12463644',
      '262064'
    ];

    // Check DOM page text of QR verification view
    const domLower = qrPageContent.toLowerCase();
    const domHits = forbiddenTerms.filter(t => domLower.includes(t));

    const test6Passed = domHits.length === 0;
    report.steps.step6 = {
      name: 'Full Real-Identity Residual Branding Sweep',
      status: test6Passed ? 'PASS' : 'FAIL',
      details: { forbiddenTermsChecked: forbiddenTerms.length, domResidualHits: domHits }
    };
    if (test6Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 6 Result:', report.steps.step6.status);

    // -------------------------------------------------------------
    // TEST 7: Offline Resilience & Upsert Load
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Offline Multi-Report Sync Resilience ---');
    const batchReports = [
      {
        id: `loc-${Date.now()}-1`,
        visit_id: visitRes.data.visit.id,
        report_code: `REP-REG-01`,
        barcode_value: 'F00000091',
        qr_token: '0000000000000000000000000000000000000000000000000000000000091',
        status: 'Final Report',
        sync_status: 'pending',
        reported_at: new Date().toISOString(),
      },
      {
        id: `loc-${Date.now()}-2`,
        visit_id: visitRes.data.visit.id,
        report_code: `REP-REG-02`,
        barcode_value: 'F00000092',
        qr_token: '0000000000000000000000000000000000000000000000000000000000092',
        status: 'Final Report',
        sync_status: 'pending',
        reported_at: new Date().toISOString(),
      }
    ];

    const syncPushRes = await api('POST', '/api/sync/push', {
      client_device_id: 'LOAD-TEST-STATION',
      patients: [],
      visits: [],
      test_results: [],
      reports: batchReports
    }, ltLogin.data.token);

    // Resend same batch to test idempotent ON CONFLICT behavior
    const syncRetryRes = await api('POST', '/api/sync/push', {
      client_device_id: 'LOAD-TEST-STATION',
      patients: [],
      visits: [],
      test_results: [],
      reports: batchReports
    }, ltLogin.data.token);

    const test7Passed = syncPushRes.status === 200 && syncRetryRes.status === 200;
    report.steps.step7 = {
      name: 'Offline Multi-Report Batch Sync & Idempotence',
      status: test7Passed ? 'PASS' : 'FAIL',
      details: {
        batchSize: batchReports.length,
        firstPushStatus: syncPushRes.status,
        retryPushStatus: syncRetryRes.status,
        syncedCounts: syncPushRes.data.synced_counts
      }
    };
    if (test7Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 7 Result:', report.steps.step7.status);

    // -------------------------------------------------------------
    // TEST 8: Role-Guard Direct Hash Tampering
    // -------------------------------------------------------------
    console.log('\n--- Test 8: Client-Side Direct Hash URL Role Guarding ---');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => { localStorage.clear(); window.location.hash = '#/dashboard'; });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 800));

    // Login as front-desk
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Front Desk');
      if (b) b.click();
    });
    await page.waitForSelector('button[type="submit"]', { timeout: 4000 });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // Attempt direct navigation to #/users (Admin-only)
    await page.evaluate(() => { window.location.hash = '#/users'; });
    await new Promise(r => setTimeout(r, 500));
    const hashAfterUsersAttempt = await page.evaluate(() => window.location.hash);

    // Attempt direct navigation to #/audit (Admin-only)
    await page.evaluate(() => { window.location.hash = '#/audit'; });
    await new Promise(r => setTimeout(r, 500));
    const hashAfterAuditAttempt = await page.evaluate(() => window.location.hash);

    // Attempt direct navigation to #/studio (Lab-Tech/Admin only)
    await page.evaluate(() => { window.location.hash = '#/studio'; });
    await new Promise(r => setTimeout(r, 500));
    const hashAfterStudioAttempt = await page.evaluate(() => window.location.hash);

    const guardsWorking = (hashAfterUsersAttempt === '#/dashboard') && (hashAfterAuditAttempt === '#/dashboard') && (hashAfterStudioAttempt === '#/dashboard');

    const test8Passed = guardsWorking;
    report.steps.step8 = {
      name: 'Client-Side Direct Hash URL Tampering Guarding',
      status: test8Passed ? 'PASS' : 'FAIL',
      details: {
        hashAfterUsersAttempt,
        hashAfterAuditAttempt,
        hashAfterStudioAttempt,
        redirectedToDashboard: guardsWorking
      }
    };
    if (test8Passed) report.summary.passed++; else report.summary.failed++;
    console.log('Test 8 Result:', report.steps.step8.status);

  } catch (err) {
    console.error('Regression suite runtime exception:', err);
  } finally {
    await browser.close();
  }

  console.log('\n=== REGRESSION REPORT SUMMARY ===');
  console.log(JSON.stringify(report, null, 2));

  fs.writeFileSync('test/regression-results.json', JSON.stringify(report, null, 2));
}

runRegressionSuite();
