/**
 * Nivaro - Customer support ticket reads.
 *
 * Runs the real GET /api/support/my-tickets handler against a local fake of
 * Supabase Auth and PostgREST. The query filter is the security boundary, so
 * the fake returns only rows matching the customer_id the handler sends.
 */

import http from 'node:http';

const USER_ID = '3f1c2a10-5d4e-4f6a-8b7c-9d0e1f2a3b4c';
const OTHER_ID = '7a8b9c0d-1e2f-4a3b-9c8d-7e6f5a4b3c2d';

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

function baseTickets() {
  return [
    {
      id: 'TKT-2026-200002',
      booking_id: 'LH-2026-2222',
      customer_id: USER_ID,
      customer_name: 'Asha Rao',
      customer_phone: '9876543210',
      issue_type: 'Billing Dispute',
      description: 'The invoice total does not match the quote.',
      status: 'In Review',
      resolution_note: null,
      created_at: '2026-10-23T10:00:00.000Z',
    },
    {
      id: 'TKT-2026-200001',
      booking_id: 'LH-2026-1111',
      customer_id: USER_ID,
      customer_name: 'Asha Rao',
      customer_phone: '9876543210',
      issue_type: 'Work Quality',
      description: 'The switch keeps sparking.',
      status: 'Open',
      resolution_note: null,
      created_at: '2026-10-22T09:00:00.000Z',
    },
    {
      id: 'TKT-2026-999999',
      booking_id: 'LH-2026-9999',
      customer_id: OTHER_ID,
      customer_name: 'Other Customer',
      customer_phone: '1111111111',
      issue_type: 'Other',
      description: 'This ticket belongs to another customer.',
      status: 'Open',
      resolution_note: null,
      created_at: '2026-10-24T12:00:00.000Z',
    },
  ];
}

function resetState(overrides = {}) {
  state = {
    authStatus: 200,
    listError: false,
    tickets: baseTickets(),
    queries: [],
    lastUserId: null,
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

async function call({
  method = 'GET',
  token = 'customer-token',
  url = '/api/support/my-tickets',
} = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = createRes();
  await handler({ method, headers, url }, res);
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

function stripEq(value) {
  return value?.startsWith('eq.') ? value.slice(3) : value;
}

server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (url.pathname === '/auth/v1/user') {
    if (state.authStatus !== 200) {
      return sendJson(res, 401, { message: 'invalid token' });
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    state.lastUserId = token === 'other-token' ? OTHER_ID : USER_ID;
    return sendJson(res, 200, {
      id: state.lastUserId,
      aud: 'authenticated',
      role: 'authenticated',
    });
  }

  if (url.pathname === '/rest/v1/support_tickets' && req.method === 'GET') {
    state.queries.push(url.search);
    if (state.listError) {
      return sendJson(res, 500, { code: 'XX000', message: 'list failed' });
    }

    const customerId = stripEq(url.searchParams.get('customer_id'));
    const rows = customerId
      ? state.tickets.filter((ticket) => ticket.customer_id === customerId)
      : state.tickets;
    return sendJson(res, 200, [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  }

  sendJson(res, 404, { message: `unexpected ${req.method} ${url.pathname}` });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

handler = (await import('../api/support/my-tickets.mjs')).default;

resetState();
let result = await call({ method: 'PUT' });
checkEqual(result.status, 405, 'rejects unsupported methods');
checkEqual(result.headers.allow, 'GET', 'advertises GET only');

resetState();
result = await call({ token: null });
checkEqual(result.status, 401, 'rejects a request without a bearer token');
checkEqual(state.queries.length, 0, 'no ticket query without a session');

resetState({ authStatus: 401 });
result = await call({ token: 'bad-token' });
checkEqual(result.status, 401, 'rejects an invalid or expired token');
checkEqual(state.queries.length, 0, 'no ticket query for an invalid token');

resetState();
result = await call();
checkEqual(result.status, 200, 'returns tickets for the signed-in customer');
checkEqual(result.body.tickets.length, 2, 'returns only the signed-in customer tickets');
check(
  result.body.tickets.every((ticket) => ticket.customerId === USER_ID),
  'never includes another customer ticket'
);
checkEqual(result.body.tickets[0].id, 'TKT-2026-200002', 'returns newest tickets first');
checkEqual(result.body.tickets[0].bookingId, 'LH-2026-2222', 'maps booking_id to camelCase');
checkEqual(result.body.tickets[0].issueType, 'Billing Dispute', 'maps issue_type to issueType');
check(!('subject' in result.body.tickets[0]), 'does not return a nonexistent subject field');

const query = new URLSearchParams(state.queries[0]);
checkEqual(query.get('customer_id'), `eq.${USER_ID}`, 'filters by the session customer id');
checkEqual(query.get('order'), 'created_at.desc', 'requests newest tickets first');
check(query.get('select').includes('issue_type'), 'selects the real issue_type column');
check(!query.get('select').includes('subject'), 'does not select a nonexistent subject column');

resetState();
result = await call({
  token: 'other-token',
  url: `/api/support/my-tickets?customer_id=${USER_ID}`,
});
checkEqual(result.status, 200, 'returns tickets for the second customer');
checkEqual(result.body.tickets.length, 1, 'returns only the second customer tickets');
check(
  result.body.tickets.every((ticket) => ticket.customerId === OTHER_ID),
  'scopes the second customer to their own identity'
);
check(
  !result.body.tickets.some((ticket) => ticket.id === 'TKT-2026-200002'),
  'does not expose the first customer ticket to the second customer'
);
const otherQuery = new URLSearchParams(state.queries[0]);
checkEqual(
  otherQuery.get('customer_id'),
  `eq.${OTHER_ID}`,
  'ignores a forged customer_id query parameter and uses the session identity'
);

resetState({ tickets: [] });
result = await call();
checkEqual(result.status, 200, 'returns an empty list when the customer has no tickets');
checkEqual(result.body.tickets.length, 0, 'returns no tickets');

resetState({ listError: true });
result = await quietly(() => call());
checkEqual(result.status, 500, 'returns 500 when the ticket query fails');
checkEqual(result.body.error, 'Could not load support tickets.', 'does not leak database details');

server.close();
console.log(`\n${passed} customer support ticket checks passed.`);
