const BASE_URL = 'http://127.0.0.1:4000';

async function runSecurityMatrix() {
  console.log('================================================================');
  console.log('SR ENTERPRISES CRM - END-TO-END AUTH SECURITY TEST MATRIX');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  [PASS] ' + message);
      passed++;
    } else {
      console.error('  [FAIL] ' + message);
      failed++;
    }
  }

  // --- PHASE 1: UNAUTHENTICATED ENDPOINTS MUST RETURN 401 ---
  console.log('PHASE 1: Unauthenticated Direct API Requests (Must all be 401 Unauthorized)');
  const protectedRoutes = [
    '/api/v1/auth/me',
    '/api/v1/dashboard/overview',
    '/api/v1/customers',
    '/api/v1/sales',
    '/api/v1/invoices',
    '/api/v1/payments',
    '/api/v1/services',
    '/api/v1/warranties',
    '/api/v1/reminders',
    '/api/v1/technicians',
    '/api/v1/settings',
    '/api/v1/analytics/overview',
    '/api/v1/search?q=test',
    '/api/v1/inventory',
  ];

  for (const route of protectedRoutes) {
    const res = await fetch(BASE_URL + route);
    assert(res.status === 401, `Unauthenticated ${route} -> Status ${res.status} (Expected 401)`);
  }

  // Public endpoint check
  console.log('\nPHASE 2: Genuinely Public Endpoints');
  const pingRes = await fetch(BASE_URL + '/api/v1/system/ping');
  assert(pingRes.status === 200, `/api/v1/system/ping -> Status ${pingRes.status} (Expected 200)`);
  const capRes = await fetch(BASE_URL + '/api/v1/auth/captcha');
  assert(capRes.status === 200, `/api/v1/auth/captcha -> Status ${capRes.status} (Expected 200)`);

  // --- PHASE 3: AUTHENTICATED LOGIN FLOW ---
  console.log('\nPHASE 3: Full Login Lifecycle');
  const loginRes = await fetch(BASE_URL + '/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'Admin@123456',
      challengeId: 'local-challenge',
      captchaAnswer: '74KB9',
      captcha: '74KB9',
    }),
  });

  assert(loginRes.status === 200, `POST /api/v1/auth/login -> Status ${loginRes.status} (Expected 200)`);
  const loginJson = await loginRes.json();
  assert(loginJson.data?.user?.role === 'Super Admin', `User Role resolved to ${loginJson.data?.user?.role}`);

  const cookie = loginRes.headers.get('set-cookie');
  assert(!!cookie && cookie.includes('sr_crm_session='), `HttpOnly session cookie received: ${!!cookie}`);

  // --- PHASE 4: AUTHENTICATED ACCESS TO PROTECTED DATA ---
  console.log('\nPHASE 4: Authenticated Requests With Session Cookie');
  const authHeaders = { 'Cookie': cookie || '' };

  const meRes = await fetch(BASE_URL + '/api/v1/auth/me', { headers: authHeaders });
  assert(meRes.status === 200, `GET /api/v1/auth/me with session -> Status ${meRes.status} (Expected 200)`);

  const dashRes = await fetch(BASE_URL + '/api/v1/dashboard/overview', { headers: authHeaders });
  assert(dashRes.status === 200, `GET /api/v1/dashboard/overview with session -> Status ${dashRes.status} (Expected 200)`);

  const custRes = await fetch(BASE_URL + '/api/v1/customers', { headers: authHeaders });
  assert(custRes.status === 200, `GET /api/v1/customers with session -> Status ${custRes.status} (Expected 200)`);

  const salesRes = await fetch(BASE_URL + '/api/v1/sales', { headers: authHeaders });
  assert(salesRes.status === 200, `GET /api/v1/sales with session -> Status ${salesRes.status} (Expected 200)`);

  const invRes = await fetch(BASE_URL + '/api/v1/invoices', { headers: authHeaders });
  assert(invRes.status === 200, `GET /api/v1/invoices with session -> Status ${invRes.status} (Expected 200)`);

  const payRes = await fetch(BASE_URL + '/api/v1/payments', { headers: authHeaders });
  assert(payRes.status === 200, `GET /api/v1/payments with session -> Status ${payRes.status} (Expected 200)`);

  // --- PHASE 5: LOGOUT FLOW ---
  console.log('\nPHASE 5: Logout and Session Invalidation');
  const logoutRes = await fetch(BASE_URL + '/api/v1/auth/logout', {
    method: 'POST',
    headers: authHeaders,
  });
  assert(logoutRes.status === 200, `POST /api/v1/auth/logout -> Status ${logoutRes.status} (Expected 200)`);

  // --- PHASE 6: POST-LOGOUT REJECTION ---
  console.log('\nPHASE 6: Access Rejected After Logout');
  const postLogoutMe = await fetch(BASE_URL + '/api/v1/auth/me', { headers: authHeaders });
  assert(postLogoutMe.status === 401, `GET /api/v1/auth/me after logout -> Status ${postLogoutMe.status} (Expected 401)`);

  const postLogoutDash = await fetch(BASE_URL + '/api/v1/dashboard/overview', { headers: authHeaders });
  assert(postLogoutDash.status === 401, `GET /api/v1/dashboard/overview after logout -> Status ${postLogoutDash.status} (Expected 401)`);

  // --- PHASE 7: TAMPERED / FAKE TOKEN REJECTION ---
  console.log('\nPHASE 7: Tampered & Forged Session Protection');
  const fakeTokenRes = await fetch(BASE_URL + '/api/v1/dashboard/overview', {
    headers: { 'Cookie': 'sr_crm_session=forged-tampered-uuid-99999999' },
  });
  assert(fakeTokenRes.status === 401, `Forged session token rejected -> Status ${fakeTokenRes.status} (Expected 401)`);

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityMatrix().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
