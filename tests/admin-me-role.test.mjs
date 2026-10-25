/**
 * Nivaro - /api/me role resolution.
 *
 * Exercises the real handler against a local fake of Supabase Auth and
 * PostgREST so JWT validation, active-admin lookup, role precedence and
 * fail-closed errors are tested rather than only grepped.
 */

import http from 'node:http';

const USER_ID = '3f1c2a10-5d4e-4f6a-8b7c-9d0e1f2a3b4c';

let server;
let handler;
let state;
let passed = 0;

function check(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  passed++;
  console.log(`  PASS: ${message}`);
}

function checkEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
  passed++;
  console.log(`  PASS: ${message}`);
}

function resetState(overrides = {}) {
  state = {
    authStatus: 200,
    appMetadata: {},
    adminRows: [],
    adminError: false,
    lastAdminQuery: '',
    ...overrides,
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function createRes() {
  const headers = {};
  return {
    statusCode: 0,
    body: '',
    headers,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(chunk = '') {
      this.body += chunk;
    },
  };
}

async function callHandler({ method = 'GET', token = 'valid-token' } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = createRes();
  await handler({ method, headers }, res);
  return {
    status: res.statusCode,
    headers: res.headers,
    body: res.body ? JSON.parse(res.body) : null,
  };
}

async function quietly(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (url.pathname === '/auth/v1/user') {
    if (state.authStatus !== 200) {
      return sendJson(res, 401, { message: 'invalid token' });
    }
    return sendJson(res, 200, {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'person@example.com',
      app_metadata: state.appMetadata,
    });
  }

  if (url.pathname === '/rest/v1/admin_users') {
    state.lastAdminQuery = url.search;
    if (state.adminError) {
      return sendJson(res, 500, { code: 'XX000', message: 'lookup failed' });
    }
    const activeOnly = url.searchParams.get('is_active') === 'eq.true';
    const rows = activeOnly
      ? state.adminRows.filter((row) => row.is_active !== false)
      : state.adminRows;
    return sendJson(res, 200, rows);
  }

  sendJson(res, 404, { message: `unexpected ${req.method} ${url.pathname}` });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const module = await import('../api/me.mjs');
handler = module.default;

resetState();
let result = await callHandler({ method: 'POST' });
checkEqual(result.status, 405, 'rejects non-GET methods');
checkEqual(result.headers.allow, 'GET', 'advertises GET as the allowed method');

resetState();
result = await callHandler({ token: null });
checkEqual(result.status, 401, 'rejects a request without a bearer token');

resetState({ authStatus: 401 });
result = await callHandler();
checkEqual(result.status, 401, 'rejects an invalid or expired token');

resetState({ adminRows: [{ role: 'admin' }] });
result = await callHandler();
checkEqual(result.status, 200, 'returns a profile for an active admin');
checkEqual(result.body.role, 'admin', 'active admin resolves to the admin role');
checkEqual(result.body.id, USER_ID, 'returns the authenticated user id');
checkEqual(Object.keys(result.body).sort().join(','), 'id,role', 'does not expose email or other PII');
check(
  state.lastAdminQuery.includes(`auth_user_id=eq.${USER_ID}`) &&
    state.lastAdminQuery.includes('role=eq.admin') &&
    state.lastAdminQuery.includes('is_active=eq.true'),
  'admin lookup requires an active admin_users row'
);

resetState({ appMetadata: { role: 'technician' } });
result = await callHandler();
checkEqual(result.status, 200, 'returns a profile for a technician');
checkEqual(result.body.role, 'technician', 'server-controlled technician metadata resolves to technician');

resetState();
result = await callHandler();
checkEqual(result.status, 200, 'returns a profile for a customer');
checkEqual(result.body.role, 'customer', 'users without an active admin row default to customer');

resetState({ adminRows: [{ role: 'admin', is_active: false }] });
result = await callHandler();
checkEqual(result.status, 200, 'returns a profile for a disabled admin');
checkEqual(result.body.role, 'customer', 'disabled admin rows never grant admin');

resetState({ adminError: true });
result = await quietly(() => callHandler());
checkEqual(result.status, 500, 'fails closed when the admin lookup errors');
checkEqual(result.body.error, 'Could not verify account role.', 'does not leak database details');

server.close();
console.log(`\n${passed} /api/me checks passed.`);
