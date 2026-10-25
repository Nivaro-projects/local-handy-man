/**
 * Nivaro - Support BFF guardrails.
 *
 * Verifies ticket input is re-derived server-side, the frontend no longer
 * persists tickets in browser storage, and the BFF client attaches the JWT.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTicketInput, toSupportTicket } from '../api/support/tickets.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;

function check(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  passed++;
  console.log(`  PASS: ${message}`);
}

const valid = parseTicketInput({
  bookingId: ' lh-2026-4821 ',
  issueType: 'Work Quality',
  description: '  The switch keeps sparking.  ',
});
check(!valid.error, 'accepts a valid ticket');
check(valid.value.bookingId === 'LH-2026-4821', 'normalizes booking id');
check(valid.value.description === 'The switch keeps sparking.', 'trims description');

check(Boolean(parseTicketInput(null).error), 'rejects a missing body');
check(Boolean(parseTicketInput({ ...valid.value, bookingId: 'LH 2026' }).error), 'rejects malformed booking id');
check(Boolean(parseTicketInput({ ...valid.value, issueType: 'Free Money' }).error), 'rejects unknown issue type');
check(Boolean(parseTicketInput({ ...valid.value, description: 'short' }).error), 'rejects short description');
check(
  Boolean(parseTicketInput({ ...valid.value, description: 'x'.repeat(5001) }).error),
  'rejects oversized description'
);

const mapped = toSupportTicket({
  id: 'TKT-2026-123456',
  booking_id: 'LH-2026-4821',
  customer_id: '8f5b1d0a-1c9f-4b0a-9d6e-2e6a1f0c3b77',
  customer_name: 'Test Customer',
  customer_phone: '9876543210',
  issue_type: 'Work Quality',
  description: 'The switch keeps sparking.',
  status: 'Open',
  resolution_note: null,
  created_at: '2026-10-23T10:00:00.000Z',
});
check(mapped.bookingId === 'LH-2026-4821', 'maps booking_id to camelCase');
check(mapped.resolutionNote === undefined, 'maps a null resolution note to undefined');

const supportService = fs.readFileSync(path.join(rootDir, 'src/services/supportService.ts'), 'utf8');
check(!/sessionStorage|localStorage/.test(supportService), 'supportService no longer uses browser storage');
check(supportService.includes("bffFetch<SupportTicket>('/support/tickets'"), 'supportService posts through the BFF');
check(supportService.includes("bffFetch<{ tickets: SupportTicket[] }>('/support/tickets')"), 'supportService lists tickets through the BFF');
check(supportService.includes("method: 'PATCH'"), 'supportService updates tickets through the BFF');
check(supportService.includes('export async function getCustomerTickets'), 'supportService fetches the signed-in customer tickets');
check(
  supportService.includes("bffFetch<{ tickets: SupportTicket[] }>('/support/my-tickets')"),
  'customer ticket reads use the customer-scoped BFF route'
);
check(supportService.includes('if (!session) return [];'), 'customer ticket reads return empty without a session');

const myTicketsPath = path.join(rootDir, 'api/support/my-tickets.mjs');
check(fs.existsSync(myTicketsPath), 'the customer ticket route exists');
const myTicketsRoute = fs.readFileSync(myTicketsPath, 'utf8');
check(myTicketsRoute.includes('requireUser(req, res)'), 'customer ticket reads require a signed-in user');
check(
  myTicketsRoute.includes(".eq('customer_id', user.id)"),
  'customer ticket reads are scoped to the session customer'
);
check(myTicketsRoute.includes('issue_type'), 'customer ticket reads select the real issue_type column');
check(!myTicketsRoute.includes('subject'), 'customer ticket reads do not select a nonexistent subject column');

const dashboard = fs.readFileSync(path.join(rootDir, 'src/components/CustomerDashboard.tsx'), 'utf8');
check(dashboard.includes('getCustomerTickets'), 'customer dashboard hydrates tickets from the server');
check(dashboard.includes('isLoadingTickets'), 'customer dashboard tracks ticket hydration state');

const bffClient = fs.readFileSync(path.join(rootDir, 'src/lib/bffClient.ts'), 'utf8');
check(bffClient.includes('Authorization = `Bearer ${session.access_token}`'), 'bffClient attaches the Supabase JWT');
check(bffClient.includes('`/api${path}`'), 'bffClient routes to same-origin /api');

const route = fs.readFileSync(path.join(rootDir, 'api/support/tickets.mjs'), 'utf8');
check(route.includes('requireUser(req, res)'), 'support route requires an authenticated user');
check(route.includes('requireAdmin(req, res)'), 'admin ticket list requires an active administrator');
check(route.includes("from('bookings')"), 'support route verifies booking ownership');
check(!route.includes('body.customer_id'), 'support route ignores client-supplied customer id');

const updateRoute = fs.readFileSync(path.join(rootDir, 'api/support/tickets/[id].mjs'), 'utf8');
check(updateRoute.includes('requireAdmin(req, res)'), 'ticket updates require an active administrator');
check(updateRoute.includes('resolution_note'), 'ticket updates write the real schema column');
check(!updateRoute.includes('updatedByAdminId'), 'ticket updates do not write a missing column');
check(updateRoute.includes("from('audit_log')"), 'ticket updates append an audit log entry');
check(updateRoute.includes('before_state'), 'ticket audits capture the prior state');
check(updateRoute.includes('after_state'), 'ticket audits capture the updated state');
check(updateRoute.includes('entity_name'), 'ticket audits use the real audit_log entity columns');
check(!updateRoute.includes('target_table'), 'ticket audits do not write a target_table column');
check(!updateRoute.includes('metadata'), 'ticket audits do not write a metadata column');

const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf8');
check(viteConfig.includes("'/api':"), 'local Vite serves API requests');
check(viteConfig.includes("target: 'http://localhost:3000'"), 'local API proxy targets the dev server');
check(viteConfig.includes('changeOrigin: true'), 'local API proxy preserves the intended origin handling');

const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
check(
  vercelConfig.rewrites?.[0]?.source.includes('(?!api/'),
  'SPA fallback does not rewrite /api routes to index.html'
);

console.log(`\n${passed} support BFF checks passed.`);
