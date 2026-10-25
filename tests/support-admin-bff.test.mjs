/**
 * Nivaro - Admin support BFF behaviour.
 *
 * Runs the real GET /api/support/tickets and PATCH /api/support/tickets/:id
 * handlers against a local fake of Supabase Auth and PostgREST. The database
 * is never contacted.
 */

import http from 'node:http';

const ADMIN_ID = '2b7c1d9e-3f4a-4b5c-8d6e-7f8a9b0c1d2e';
const CUSTOMER_ID = '9c8d7e6f-5a4b-4c3d-8e2f-1a0b9c8d7e6f';
const TICKET_ID = 'TKT-2026-482193';

let server;
let collectionHandler;
let itemHandler;
let parseTicketUpdate;
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
      id: TICKET_ID,
      booking_id: 'LH-2026-4821',
      customer_id: CUSTOMER_ID,
      customer_name: 'Asha Rao',
      customer_phone: '9876543210',
      issue_type: 'Work Quality',
      description: 'The switch keeps sparking.',
      status: 'Open',
      resolution_note: null,
      created_at: '2026-10-23T10:00:00.000Z',
    },
    {
      id: 'TKT-2026-111111',
      booking_id: 'LH-2026-1111',
      customer_id: CUSTOMER_ID,
      customer_name: 'Asha Rao',
      customer_phone: '9876543210',
      issue_type: 'Delayed Arrival',
      description: 'The technician arrived two hours late.',
      status: 'In Review',
      resolution_note: 'Waiting on technician response.',
      created_at: '2026-10-22T09:00:00.000Z',
    },
  ];
}

function resetState(overrides = {}) {
  state = {
    authStatus: 200,
    adminRows: [{ role: 'admin' }],
    customerAdminRows: [],
    adminError: false,
    listError: false,
    ticketFetchError: false,
    updateError: false,
    auditError: false,
    tickets: baseTickets(),
    lastUserId: null,
    adminLookups: 0,
    listQueries: [],
    ticketFetchQueries: [],
    updateQueries: [],
    updateBodies: [],
    auditBodies: [],
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

async function call(handler, { method = 'GET', body, query = {}, token = 'admin-token' } = {}) {
  const headers = token ? { authorization: `Bearer ${token}` } : {};
  const res = createRes();
  await handler({ method, headers, query, body }, res);
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

server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (url.pathname === '/auth/v1/user') {
    if (state.authStatus !== 200) {
      return sendJson(res, 401, { message: 'invalid token' });
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    state.lastUserId = token === 'customer-token' ? CUSTOMER_ID : ADMIN_ID;
    return sendJson(res, 200, {
      id: state.lastUserId,
      aud: 'authenticated',
      role: 'authenticated',
    });
  }

  if (url.pathname === '/rest/v1/admin_users') {
    state.adminLookups++;
    if (state.adminError) {
      return sendJson(res, 500, { code: 'XX000', message: 'admin lookup failed' });
    }
    return sendJson(
      res,
      200,
      state.lastUserId === ADMIN_ID ? state.adminRows : state.customerAdminRows
    );
  }

  if (url.pathname === '/rest/v1/support_tickets' && req.method === 'GET') {
    const id = stripEq(url.searchParams.get('id'));
    if (id) {
      state.ticketFetchQueries.push(url.search);
      if (state.ticketFetchError) {
        return sendJson(res, 500, { code: 'XX000', message: 'ticket lookup failed' });
      }
      return sendJson(res, 200, state.tickets.filter((ticket) => ticket.id === id));
    }

    state.listQueries.push(url.search);
    if (state.listError) {
      return sendJson(res, 500, { code: 'XX000', message: 'list failed' });
    }
    const status = stripEq(url.searchParams.get('status'));
    const rows = status ? state.tickets.filter((ticket) => ticket.status === status) : state.tickets;
    return sendJson(res, 200, rows);
  }

  if (url.pathname === '/rest/v1/support_tickets' && req.method === 'PATCH') {
    const body = await readBody(req);
    state.updateQueries.push(url.search);
    state.updateBodies.push(body);
    if (state.updateError) {
      return sendJson(res, 500, { code: 'XX000', message: 'update failed' });
    }

    const id = stripEq(url.searchParams.get('id'));
    const index = state.tickets.findIndex((ticket) => ticket.id === id);
    if (index === -1) return sendJson(res, 200, []);

    state.tickets[index] = { ...state.tickets[index], ...body };
    return sendJson(res, 200, [state.tickets[index]]);
  }

  if (url.pathname === '/rest/v1/audit_log' && req.method === 'POST') {
    const body = await readBody(req);
    state.auditBodies.push(body);
    if (state.auditError) {
      return sendJson(res, 500, { code: 'XX000', message: 'audit insert failed' });
    }
    return sendJson(res, 201, body);
  }

  sendJson(res, 404, { message: `unexpected ${req.method} ${url.pathname}` });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

process.env.SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const collection = await import('../api/support/tickets.mjs');
const item = await import('../api/support/tickets/[id].mjs');
collectionHandler = collection.default;
itemHandler = item.default;
parseTicketUpdate = item.parseTicketUpdate;

resetState();
let result = await call(collectionHandler, { method: 'PUT' });
checkEqual(result.status, 405, 'rejects unsupported collection methods');
checkEqual(result.headers.allow, 'GET, POST', 'advertises GET and POST');

resetState();
result = await call(collectionHandler, { token: null });
checkEqual(result.status, 401, 'rejects an unauthenticated admin list request');

resetState({ authStatus: 401 });
result = await call(collectionHandler, { token: 'bad-token' });
checkEqual(result.status, 401, 'rejects an invalid admin token');

resetState();
result = await call(collectionHandler, { token: 'customer-token' });
checkEqual(result.status, 403, 'refuses a non-admin ticket list');
checkEqual(state.adminLookups, 1, 'checks admin_users for the ticket list');

resetState();
result = await call(collectionHandler);
checkEqual(result.status, 200, 'lists tickets for an active admin');
checkEqual(result.body.tickets.length, 2, 'returns every ticket');
checkEqual(result.body.tickets[0].customerName, 'Asha Rao', 'maps ticket rows to camelCase');
check(
  state.listQueries[0].includes('order=created_at.desc'),
  'requests newest tickets first'
);

resetState();
result = await call(collectionHandler, { query: { status: 'Open' } });
checkEqual(result.status, 200, 'accepts a valid status filter');
checkEqual(result.body.tickets.length, 1, 'filters by status in the database query');
check(state.listQueries[0].includes('status=eq.Open'), 'passes the status filter to PostgREST');

resetState();
result = await call(collectionHandler, { query: { status: 'open' } });
checkEqual(result.status, 400, 'rejects a status that is not in the schema');
checkEqual(state.listQueries.length, 0, 'no list query for an invalid status filter');

resetState({ adminError: true });
result = await quietly(() => call(collectionHandler));
checkEqual(result.status, 500, 'fails closed when the admin lookup fails');
checkEqual(result.body.error, 'Could not verify administrator access.', 'does not leak admin lookup details');

resetState({ listError: true });
result = await quietly(() => call(collectionHandler));
checkEqual(result.status, 500, 'returns 500 when the ticket list query fails');
checkEqual(result.body.error, 'Could not load support tickets.', 'does not leak database details');

resetState();
result = await call(itemHandler, { method: 'GET' });
checkEqual(result.status, 405, 'rejects unsupported ticket update methods');
checkEqual(result.headers.allow, 'PATCH', 'advertises PATCH for ticket updates');

resetState();
result = await call(itemHandler, { method: 'PATCH', token: null, query: { id: TICKET_ID }, body: { status: 'Resolved' } });
checkEqual(result.status, 401, 'rejects an unauthenticated ticket update');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  token: 'customer-token',
  query: { id: TICKET_ID },
  body: { status: 'Resolved' },
});
checkEqual(result.status, 403, 'refuses a non-admin ticket update');
checkEqual(state.ticketFetchQueries.length, 0, 'no ticket lookup for a non-admin caller');
checkEqual(state.updateQueries.length, 0, 'no update for a non-admin caller');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: 'TKT-2026-X' },
  body: { status: 'Resolved' },
});
checkEqual(result.status, 400, 'rejects a malformed ticket reference');
checkEqual(state.updateQueries.length, 0, 'no update for a malformed ticket reference');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: TICKET_ID },
  body: { status: 'open' },
});
checkEqual(result.status, 400, 'rejects a status that is not in the schema');
checkEqual(state.updateQueries.length, 0, 'no update for an invalid status');

resetState();
result = await call(itemHandler, { method: 'PATCH', query: { id: TICKET_ID }, body: {} });
checkEqual(result.status, 400, 'requires a status or resolution note');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: TICKET_ID },
  body: { status: 'In Review' },
});
checkEqual(result.status, 200, 'updates a ticket status for an active admin');
checkEqual(result.body.status, 'In Review', 'returns the updated status');
checkEqual(state.updateBodies[0].status, 'In Review', 'writes the schema status value');
check(state.updateQueries[0].includes(`id=eq.${TICKET_ID}`), 'updates the requested ticket');
check(!('updatedByAdminId' in state.updateBodies[0]), 'does not write a column that does not exist');
check(!('updated_at' in state.updateBodies[0]), 'does not write a missing updated_at column');
checkEqual(state.ticketFetchQueries.length, 1, 'reads the ticket before updating it');
check(
  state.ticketFetchQueries[0].includes(`id=eq.${TICKET_ID}`),
  'reads the requested ticket status'
);
checkEqual(state.auditBodies.length, 1, 'writes an audit log entry after the update');
checkEqual(state.auditBodies[0].actor_id, ADMIN_ID, 'audits the authenticated administrator');
checkEqual(state.auditBodies[0].action, 'UPDATE_SUPPORT_TICKET_STATUS', 'records the update action');
checkEqual(state.auditBodies[0].entity_name, 'support_tickets', 'audits the support ticket table');
checkEqual(state.auditBodies[0].entity_id, TICKET_ID, 'audits the updated ticket id');
checkEqual(state.auditBodies[0].before_state.status, 'Open', 'records the prior status');
checkEqual(state.auditBodies[0].after_state.status, 'In Review', 'records the new status');
checkEqual(state.auditBodies[0].before_state.resolution_note, null, 'records the prior note');
check(!('target_table' in state.auditBodies[0]), 'does not write a target_table column');
check(!('target_id' in state.auditBodies[0]), 'does not write a target_id column');
check(!('metadata' in state.auditBodies[0]), 'does not write a metadata column');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: TICKET_ID },
  body: { resolutionNote: '  Fixed the switch.  ' },
});
checkEqual(result.status, 200, 'accepts a resolution note without a status');
checkEqual(state.updateBodies[0].resolution_note, 'Fixed the switch.', 'writes the trimmed resolution_note');
checkEqual(result.body.resolutionNote, 'Fixed the switch.', 'returns the mapped resolution note');
checkEqual(state.auditBodies[0].after_state.resolution_note, 'Fixed the switch.', 'audits the new note');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: TICKET_ID },
  body: { status: 'Resolved', resolutionNotes: 'Customer confirmed.' },
});
checkEqual(result.status, 200, 'accepts the legacy resolutionNotes field');
checkEqual(state.updateBodies[0].resolution_note, 'Customer confirmed.', 'maps the legacy field to resolution_note');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: TICKET_ID },
  body: { resolutionNote: 'x'.repeat(5001) },
});
checkEqual(result.status, 400, 'rejects an oversized resolution note');

resetState();
result = await call(itemHandler, {
  method: 'PATCH',
  query: { id: 'TKT-2026-999999' },
  body: { status: 'Resolved' },
});
checkEqual(result.status, 404, 'returns 404 when the ticket does not exist');
checkEqual(state.updateQueries.length, 0, 'no update for a missing ticket');
checkEqual(state.auditBodies.length, 0, 'no audit entry for a missing ticket');

resetState({ ticketFetchError: true });
result = await quietly(() =>
  call(itemHandler, { method: 'PATCH', query: { id: TICKET_ID }, body: { status: 'Resolved' } })
);
checkEqual(result.status, 500, 'returns 500 when the prior ticket lookup fails');
checkEqual(state.updateQueries.length, 0, 'no update when the prior ticket lookup fails');
checkEqual(state.auditBodies.length, 0, 'no audit entry when the prior ticket lookup fails');

resetState({ updateError: true });
result = await quietly(() =>
  call(itemHandler, { method: 'PATCH', query: { id: TICKET_ID }, body: { status: 'Resolved' } })
);
checkEqual(result.status, 500, 'returns 500 when the ticket update fails');
checkEqual(result.body.error, 'Could not update the support ticket.', 'does not leak database details');
checkEqual(state.auditBodies.length, 0, 'no audit entry when the update fails');

resetState({ auditError: true });
const auditFailureLogs = [];
const originalConsoleError = console.error;
console.error = (...args) => auditFailureLogs.push(args.map(String).join(' '));
try {
  result = await call(itemHandler, {
    method: 'PATCH',
    query: { id: TICKET_ID },
    body: { status: 'Resolved' },
  });
} finally {
  console.error = originalConsoleError;
}
checkEqual(result.status, 200, 'returns success when only audit logging fails');
checkEqual(result.body.status, 'Resolved', 'returns the updated ticket after an audit failure');
checkEqual(state.auditBodies.length, 1, 'still attempts to write the audit entry');
check(
  auditFailureLogs.some((line) => line.includes('support ticket audit insert failed')),
  'logs the audit insert failure'
);

const parsed = parseTicketUpdate({ status: 'Resolved', resolutionNote: 'done' });
check(!parsed.error, 'exports a pure ticket update parser');
checkEqual(parsed.value.status, 'Resolved', 'parser keeps the status');
checkEqual(parsed.value.resolutionNote, 'done', 'parser keeps the note');

server.close();
console.log(`\n${passed} admin support BFF checks passed.`);
