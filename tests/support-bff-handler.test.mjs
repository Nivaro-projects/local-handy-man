/**
 * Nivaro - Support BFF handler behaviour.
 *
 * Runs the real POST /api/support/tickets handler against a local fake of the
 * Supabase Auth and PostgREST endpoints, so auth, ownership, insert retry and
 * error mapping are exercised rather than grepped. Admin GET/PATCH live in
 * tests/support-admin-bff.test.mjs.
 */

import http from 'node:http';

const USER_ID = '3f1c2a10-5d4e-4f6a-8b7c-9d0e1f2a3b4c';
const OTHER_ID = '7a8b9c0d-1e2f-4a3b-9c8d-7e6f5a4b3c2d';
const BOOKING_ID = 'LH-2026-4821';

let server;
let handler;
let parseTicketInput;
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
    bookingRows: [],
    bookingError: false,
    insertResponses: [],
    insertedRows: [],
    insertAttempts: 0,
    ...overrides,
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
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

async function callHandler({ method = 'POST', body, token = 'valid-token' } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = createRes();
  await handler({ method, headers, body }, res);
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
    return sendJson(res, 200, { id: USER_ID, aud: 'authenticated', role: 'authenticated' });
  }

  if (url.pathname === '/rest/v1/bookings') {
    if (state.bookingError) {
      return sendJson(res, 500, { code: 'XX000', message: 'booking lookup failed' });
    }
    return sendJson(res, 200, state.bookingRows);
  }

  if (url.pathname === '/rest/v1/support_tickets' && req.method === 'POST') {
    state.insertAttempts++;
    const body = await readBody(req);
    const action = state.insertResponses.shift() ?? 'ok';

    if (action === 'conflict') {
      return sendJson(res, 409, { code: '23505', message: 'duplicate key value' });
    }
    if (action === 'error') {
      return sendJson(res, 500, { code: 'XX000', message: 'insert failed' });
    }

    state.insertedRows.push(body);
    return sendJson(res, 201, { ...body, created_at: '2026-10-23T10:00:00.000Z' });
  }

  sendJson(res, 404, { message: `unexpected ${req.method} ${url.pathname}` });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const module = await import('../api/support/tickets.mjs');
handler = module.default;
parseTicketInput = module.parseTicketInput;

const validBody = {
  bookingId: BOOKING_ID,
  issueType: 'Work Quality',
  description: 'The switch keeps sparking when the fan is on.',
};

const ownedBooking = {
  id: BOOKING_ID,
  customer_id: USER_ID,
  full_name: 'Asha Rao',
  phone: '+91 98765 43210',
};

resetState();
let result = await callHandler({ method: 'PUT' });
checkEqual(result.status, 405, 'rejects unsupported methods');
checkEqual(result.headers.allow, 'GET, POST', 'advertises the allowed methods');

resetState();
result = await callHandler({ token: null });
checkEqual(result.status, 401, 'rejects a request without a bearer token');

resetState({ authStatus: 401 });
result = await callHandler();
checkEqual(result.status, 401, 'rejects an invalid or expired token');

resetState();
result = await callHandler({ body: { ...validBody, description: 'short' } });
checkEqual(result.status, 400, 'rejects an invalid body before touching the database');
checkEqual(state.insertAttempts, 0, 'no insert attempt for an invalid body');
checkEqual(state.bookingRows.length, 0, 'no booking lookup for an invalid body');

resetState({ bookingRows: [] });
result = await callHandler({ body: validBody });
checkEqual(result.status, 404, 'returns 404 when the booking does not exist');

resetState({ bookingRows: [{ ...ownedBooking, customer_id: OTHER_ID }] });
result = await callHandler({ body: validBody });
checkEqual(result.status, 403, 'refuses a booking owned by another customer');
checkEqual(state.insertAttempts, 0, 'no insert attempt for a foreign booking');

resetState({ bookingRows: [ownedBooking] });
result = await callHandler({
  body: {
    ...validBody,
    customerId: OTHER_ID,
    customerName: 'Mallory',
    customerPhone: '1111111111',
  },
});
checkEqual(result.status, 201, 'creates a ticket for the booking owner');
checkEqual(result.body.customerId, USER_ID, 'derives customer id from the session, not the body');
checkEqual(result.body.customerName, 'Asha Rao', 'derives customer name from the booking');
checkEqual(result.body.customerPhone, '9876543210', 'normalizes the booking phone number');
checkEqual(result.body.bookingId, BOOKING_ID, 'returns the booking reference');
checkEqual(result.body.status, 'Open', 'opens the ticket');
check(/^TKT-\d{4}-\d{6}$/.test(result.body.id), 'issues a formatted ticket id');

resetState({ bookingRows: [ownedBooking], insertResponses: ['conflict', 'ok'] });
result = await callHandler({ body: validBody });
checkEqual(result.status, 201, 'retries once after a duplicate ticket id');
checkEqual(state.insertAttempts, 2, 'performs exactly two insert attempts');

resetState({ bookingRows: [ownedBooking], insertResponses: ['error'] });
result = await quietly(() => callHandler({ body: validBody }));
checkEqual(result.status, 500, 'returns 500 for a non-recoverable insert error');
checkEqual(result.body.error, 'Could not save the support ticket.', 'does not leak database details');

resetState({ bookingRows: [ownedBooking], insertResponses: ['conflict', 'conflict', 'conflict'] });
result = await callHandler({ body: validBody });
checkEqual(result.status, 503, 'gives up after three duplicate ticket ids');
checkEqual(state.insertAttempts, 3, 'stops retrying after the third conflict');

resetState({ bookingError: true });
result = await quietly(() => callHandler({ body: validBody }));
checkEqual(result.status, 500, 'returns 500 when the booking lookup fails');

server.close();
console.log(`\n${passed} support BFF handler checks passed.`);
