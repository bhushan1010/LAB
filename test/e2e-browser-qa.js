const puppeteer = require('puppeteer-core');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:5000';

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BACKEND_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runQA() {
  console.log('=== STARTING END-TO-END BROWSER QA TEST PASS ===');
  const results = {
    meta: {
      timestamp: new Date().toISOString(),
      frontendUrl: FRONTEND_URL,
      backendUrl: BACKEND_URL,
      browser: 'Google Chrome 134.x (Headless CDP)'
    },
    steps: {},
    security: {},
    branding: {},
    consoleErrors: [],
    networkErrors: []
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    results.consoleErrors.push('PAGE_ERROR: ' + err.toString());
  });

  page.on('requestfailed', req => {
    results.networkErrors.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
  });

  try {
    // ----------------------------------------------------
    // STEP 1: AUTHENTICATION & ROLE-BASED ACCESS CONTROL
    // ----------------------------------------------------
    console.log('\n--- Step 1: Testing Auth ---');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });

    // Check login page brand
    const loginBrand = await page.$eval('h2', el => el.textContent.trim());
    console.log('Login brand title:', loginBrand);

    // 1A. Login as front-desk using Quick Fill button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Front Desk');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    const fdText = await page.evaluate(() => document.body.innerText);
    const fdRoleOk = fdText.includes('FRONT-DESK') && fdText.includes('Pooja Verma');
    const fdBrandOk = fdText.includes('LabTrack LIMS');
    const fdNoStudioInNav = await page.evaluate(() => {
      const nav = document.querySelector('header');
      return nav ? !nav.innerText.includes('Report Studio') && !nav.innerText.includes('Staff') : true;
    });

    // Logout
    await page.evaluate(() => {
      localStorage.clear();
      window.location.reload();
    });
    await new Promise(r => setTimeout(r, 1200));

    // 1B. Login as admin
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Admin');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    const adminText = await page.evaluate(() => document.body.innerText);
    const adminRoleOk = adminText.includes('ADMIN') && adminText.includes('Dr. Lab Administrator');
    const adminHasStaffNav = await page.evaluate(() => {
      const nav = document.querySelector('header');
      return nav ? nav.innerText.includes('Staff') && nav.innerText.includes('Audit Trail') : false;
    });

    // Logout
    await page.evaluate(() => {
      localStorage.clear();
      window.location.reload();
    });
    await new Promise(r => setTimeout(r, 1200));

    // 1C. Login as lab-tech (keep logged in for Steps 2-6)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Lab Tech');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    const ltText = await page.evaluate(() => document.body.innerText);
    const ltRoleOk = ltText.includes('LAB-TECH') && ltText.includes('Rahul Sharma');

    // Navigate to studio as lab-tech
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.includes('Report Studio') || x.textContent.includes('Open Studio'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const inStudio = await page.evaluate(() => /freeform test parameters/i.test(document.body.innerText));

    results.steps.step1 = {
      status: (loginBrand === 'LabTrack LIMS' && fdRoleOk && fdBrandOk && fdNoStudioInNav && adminRoleOk && adminHasStaffNav && ltRoleOk && inStudio) ? 'PASS' : 'FAIL',
      details: { loginBrand, fdRoleOk, fdBrandOk, fdNoStudioInNav, adminRoleOk, adminHasStaffNav, ltRoleOk, inStudio }
    };
    console.log('Step 1 Result:', results.steps.step1.status);

    // ----------------------------------------------------
    // STEP 2: PATIENT & VISIT CREATION
    // ----------------------------------------------------
    console.log('\n--- Step 2: Testing Patient / Visit Creation ---');
    // Click "+ New Patient"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newBtn = btns.find(x => x.textContent.includes('New Patient'));
      if (newBtn) newBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Fill in Full Name
    const nameInput = await page.$('input[placeholder="e.g. RAHUL DEMO"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await nameInput.type('Test Patient QA1', { delay: 20 });
    }
    await new Promise(r => setTimeout(r, 600));

    const previewHasName = await page.evaluate(() => {
      const report = document.getElementById('printable-report');
      return report ? report.innerText.includes('Test Patient QA1') : false;
    });

    results.steps.step2 = {
      status: previewHasName ? 'PASS' : 'FAIL',
      details: { previewHasName }
    };
    console.log('Step 2 Result:', results.steps.step2.status);

    // ----------------------------------------------------
    // STEP 3: FREEFORM TEST RESULT ENTRY
    // ----------------------------------------------------
    console.log('\n--- Step 3: Testing Test Results Entry ---');
    // Click Quick Fill Glucose
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Glucose');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Add row
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const addBtn = btns.find(x => x.textContent.includes('Add Another Test Parameter'));
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Fill in the new test row
    const testNameInputs = await page.$$('div.grid.grid-cols-12 input[placeholder="e.g. Plasma Glucose-Random"]');
    if (testNameInputs.length > 1) {
      const lastInput = testNameInputs[testNameInputs.length - 1];
      await lastInput.click();
      await lastInput.type('Serum Creatinine', { delay: 20 });
    }
    const valInputs = await page.$$('div.grid.grid-cols-12 input[placeholder="e.g. 114"]');
    if (valInputs.length > 1) {
      const lastVal = valInputs[valInputs.length - 1];
      await lastVal.click();
      await lastVal.type('1.1', { delay: 20 });
    }
    await new Promise(r => setTimeout(r, 600));

    const previewHasCreatinine = await page.evaluate(() => {
      const report = document.getElementById('printable-report');
      return report ? report.innerText.includes('Serum Creatinine') : false;
    });

    results.steps.step3 = {
      status: previewHasCreatinine ? 'PASS' : 'FAIL',
      details: { previewHasCreatinine }
    };
    console.log('Step 3 Result:', results.steps.step3.status);

    // ----------------------------------------------------
    // STEP 4: REPORT GENERATION & LIVE PREVIEW / PDF
    // ----------------------------------------------------
    console.log('\n--- Step 4: Testing Report Generation & Live Preview ---');
    const previewBranding = await page.evaluate(() => {
      const report = document.getElementById('printable-report');
      if (!report) return null;
      const text = report.innerText;
      return {
        hasSunrise: text.includes('SUNRISE'),
        hasDemoSubtitle: /diagnostic & research centre \(demo\)/i.test(text),
        hasGenericAddress: text.includes('[Your Lab Address Here]'),
        hasZeroMobile: text.includes('0000000000'),
        hasDoctorSample: text.includes('Dr. SAMPLE SIGNATORY'),
        hasRegZero: text.includes('Reg. No. - 00000'),
        hasSignatureArea: text.includes('(Physical Doctor Signature & Stamp Area)'),
        hasBarcode: !!report.querySelector('svg') || !!report.querySelector('canvas') || text.includes('Barcode No'),
        hasQr: !!report.querySelector('img[alt*="QR"]') || text.includes('Scan QR for Online'),
        noModern: !text.includes('MODERN'),
        noBansal: !text.includes('Bansal'),
        noIndore: !text.includes('indore') && !text.includes('Indore'),
        noVijayNagar: !text.includes('Vijay Nagar')
      };
    });

    results.steps.step4 = {
      status: (previewBranding && previewBranding.hasSunrise && previewBranding.hasDoctorSample && previewBranding.noModern && previewBranding.noBansal && previewBranding.noIndore) ? 'PASS' : 'FAIL',
      details: previewBranding
    };
    console.log('Step 4 Result:', results.steps.step4.status);

    // ----------------------------------------------------
    // STEP 5: LOCAL-SAVE & SYNC
    // ----------------------------------------------------
    console.log('\n--- Step 5: Testing Local-Save & Sync ---');
    page.once('dialog', async dialog => {
      await dialog.dismiss();
    });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(x => x.textContent.includes('Save & Finalize'));
      if (saveBtn) saveBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Get labtech token for authorized sync check
    const ltToken = await page.evaluate(() => localStorage.getItem('lab_token'));
    const syncApiRes = await apiRequest('GET', '/api/sync/status', null, ltToken);

    results.steps.step5 = {
      status: (syncApiRes.status === 200 && syncApiRes.data.success) ? 'PASS' : 'FAIL',
      details: { syncApiRes: syncApiRes.data }
    };
    console.log('Step 5 Result:', results.steps.step5.status);

    // ----------------------------------------------------
    // STEP 6: BARCODE SCAN-TO-LOOKUP SIMULATION
    // ----------------------------------------------------
    console.log('\n--- Step 6: Testing Barcode Rapid Scanner ---');
    const barcodeToScan = 'F00000001';
    await page.evaluate((code) => {
      for (const ch of code) {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true }));
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    }, barcodeToScan);

    await new Promise(r => setTimeout(r, 1000));
    const scanApplied = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Barcode F00000001 applied') || text.includes('F00000001');
    });

    results.steps.step6 = {
      status: scanApplied ? 'PASS' : 'FAIL',
      details: { scanned: barcodeToScan, scanApplied }
    };
    console.log('Step 6 Result:', results.steps.step6.status);

    // ----------------------------------------------------
    // STEP 7: PUBLIC QR REPORT VIEW & TOKEN TAMPERING
    // ----------------------------------------------------
    console.log('\n--- Step 7: Testing Public QR Report View ---');
    const validToken = '8338b25c987c49fda39943eeca8df973098664e96b60082e972ce12e50620370';
    const publicPage = await browser.newPage();
    await publicPage.goto(`${FRONTEND_URL}/report/${validToken}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const publicContent = await publicPage.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasVerified: text.includes('Official Authenticated Pathology Report') || text.includes('Verified'),
        hasSunrise: text.includes('SUNRISE'),
        hasDemoSubtitle: /diagnostic & research centre/i.test(text),
        hasDoctorSample: text.includes('Dr. SAMPLE SIGNATORY'),
        noModern: !text.includes('MODERN'),
        noBansal: !text.includes('Bansal'),
        noIndore: !text.includes('indore') && !text.includes('Indore'),
        noVijayNagar: !text.includes('Vijay Nagar')
      };
    });

    // Test QR Tampering (1 character flipped)
    const tamperedToken = validToken.slice(0, -1) + (validToken.endsWith('0') ? '1' : '0');
    await publicPage.goto(`${FRONTEND_URL}/report/${tamperedToken}`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const tamperedContent = await publicPage.evaluate(() => document.body.innerText);
    const tamperingDetected = tamperedContent.includes('Report Verification Failed') || tamperedContent.includes('Report not found or verification token is invalid');

    // API public check for tampered token
    const tamperedApi = await apiRequest('GET', `/api/public/reports/${tamperedToken}`);
    const apiTamperRejected = (tamperedApi.status === 404 && tamperedApi.data.success === false);

    await publicPage.close();

    results.steps.step7 = {
      status: (publicContent.hasVerified && publicContent.hasSunrise && publicContent.noModern && tamperingDetected && apiTamperRejected) ? 'PASS' : 'FAIL',
      details: { publicContent, tamperingDetected, apiTamperRejected }
    };
    console.log('Step 7 Result:', results.steps.step7.status);

    // ----------------------------------------------------
    // STEP 8: ADMIN DASHBOARD & SECURITY AUDIT
    // ----------------------------------------------------
    console.log('\n--- Step 8: Testing Admin Dashboard & Security ---');
    // Re-login as admin
    await page.evaluate(() => {
      localStorage.clear();
      window.location.reload();
    });
    await new Promise(r => setTimeout(r, 1200));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent.trim() === 'Admin');
      if (b) b.click();
    });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 1200));

    // Navigate to Staff Accounts
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const uBtn = btns.find(x => x.textContent.includes('Staff'));
      if (uBtn) uBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const userPageText = await page.evaluate(() => document.body.innerText);
    const usersLoaded = /staff account management/i.test(userPageText) && userPageText.includes('labtech1') && userPageText.includes('reception1');

    // Navigate to Audit Trail
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const aBtn = btns.find(x => x.textContent.includes('Audit Trail'));
      if (aBtn) aBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    const auditText = await page.evaluate(() => document.body.innerText);
    const auditLoaded = /audit/i.test(auditText);

    results.steps.step8 = {
      status: (usersLoaded && auditLoaded) ? 'PASS' : 'FAIL',
      details: { usersLoaded, auditLoaded }
    };
    console.log('Step 8 Result:', results.steps.step8.status);

    // ----------------------------------------------------
    // SECURITY TESTS (API Boundaries & Enumeration)
    // ----------------------------------------------------
    console.log('\n--- Running Security Findings Assertions ---');
    const unauthUsers = await apiRequest('GET', '/api/auth/users');
    const unauthBlocked = (unauthUsers.status === 401);

    const fdLoginRes = await apiRequest('POST', '/api/auth/login', { username: 'reception1', password: 'DeskPassword123!' });
    const fdToken = fdLoginRes.data?.token;
    const fdUsersAttempt = await apiRequest('GET', '/api/auth/users', null, fdToken);
    const fdBlockedFromUsers = (fdUsersAttempt.status === 403);

    const fdTestResultAttempt = await apiRequest('POST', '/api/test-results', {
      visit_id: '00000000-0000-0000-0000-000000000000',
      department: 'BIOCHEMISTRY',
      test_name: 'Test',
      result_value: '10'
    }, fdToken);
    const fdBlockedFromTests = (fdTestResultAttempt.status === 403);

    const publicEnumAttempt = await apiRequest('GET', '/api/public/reports/');
    const enumBlocked = (publicEnumAttempt.status === 404 || publicEnumAttempt.status === 400);

    results.security = {
      unauthBlocked,
      fdBlockedFromUsers,
      fdBlockedFromTests,
      enumBlocked,
      tamperingDetected: apiTamperRejected
    };

    console.log('Security Results:', results.security);

  } finally {
    await browser.close();
  }

  console.log('\n=== FINAL QA SUMMARY ===');
  console.log(JSON.stringify(results, null, 2));
}

runQA().catch(err => {
  console.error('QA Test Run Failed:', err);
  process.exit(1);
});
