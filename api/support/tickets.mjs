import { randomInt } from 'node:crypto';
import {
  methodNotAllowed,
  readJsonBody,
  requireAdmin,
  requireUser,
  sendJson,
  supabaseAdmin,
} from '../_lib/supabaseAdmin.mjs';

const SUPPORT_STATUSES = new Set(['Open', 'In Review', 'Resolved']);

const ISSUE_TYPES = new Set([
  'Work Quality',
  'Delayed Arrival',
  'Billing Dispute',
  'Technician Behavior',
  'Incomplete Work',
  'Other',
]);

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 5000;
const BOOKING_ID_PATTERN = /^[A-Z0-9][A-Z0-9-]{2,63}$/;

function toSupportTicket(row) {
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    issueType: row.issue_type,
    description: row.description,
    createdAt: row.created_at ?? new Date().toISOString(),
    status: row.status,
    resolutionNote: row.resolution_note ?? undefined,
  };
}

export function parseTicketInput(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'A JSON request body is required.' };
  }

  const bookingId = typeof body.bookingId === 'string'
    ? body.bookingId.trim().toUpperCase()
    : '';
  if (!BOOKING_ID_PATTERN.test(bookingId)) {
    return { error: 'A valid booking reference is required.' };
  }

  if (!ISSUE_TYPES.has(body.issueType)) {
    return { error: 'Unknown issue type.' };
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (description.length < MIN_DESCRIPTION || description.length > MAX_DESCRIPTION) {
    return { error: `Description must be ${MIN_DESCRIPTION}-${MAX_DESCRIPTION} characters.` };
  }

  return { value: { bookingId, issueType: body.issueType, description } };
}

async function listTickets(req, res) {
  if (!(await requireAdmin(req, res))) return;

  const rawStatus = req.query?.status;
  const status = typeof rawStatus === 'string' ? rawStatus.trim() : '';
  if (status && !SUPPORT_STATUSES.has(status)) {
    return sendJson(res, 400, { error: 'Invalid ticket status filter.' });
  }

  try {
    let query = supabaseAdmin
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('support ticket list failed:', error);
      return sendJson(res, 500, { error: 'Could not load support tickets.' });
    }

    return sendJson(res, 200, { tickets: (data ?? []).map(toSupportTicket) });
  } catch (error) {
    console.error('support ticket list request failed:', error);
    return sendJson(res, 500, { error: 'Could not load support tickets.' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return listTickets(req, res);
  }

  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['GET', 'POST']);
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = parseTicketInput(readJsonBody(req));
  if (parsed.error) {
    return sendJson(res, 400, { error: parsed.error });
  }

  const { bookingId, issueType, description } = parsed.value;

  try {
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, customer_id, full_name, phone')
      .eq('id', bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error('support ticket booking lookup failed:', bookingError);
      return sendJson(res, 500, { error: 'Could not verify the booking.' });
    }
    if (!booking) {
      return sendJson(res, 404, { error: 'Booking not found.' });
    }
    if (booking.customer_id !== user.id) {
      return sendJson(res, 403, { error: 'You can only report an issue on your own booking.' });
    }

    const customerPhone = String(booking.phone ?? '').replace(/\D/g, '').slice(-10);
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < 3; attempt++) {
      const ticketId = `TKT-${year}-${randomInt(100000, 1000000)}`;
      const { data, error } = await supabaseAdmin
        .from('support_tickets')
        .insert({
          id: ticketId,
          booking_id: booking.id,
          customer_id: user.id,
          customer_name: booking.full_name,
          customer_phone: customerPhone,
          issue_type: issueType,
          description,
          status: 'Open',
        })
        .select('*')
        .single();

      if (!error) {
        return sendJson(res, 201, toSupportTicket(data));
      }

      // A duplicate ticket id is the only recoverable conflict.
      if (error.code !== '23505') {
        console.error('support ticket insert failed:', error);
        return sendJson(res, 500, { error: 'Could not save the support ticket.' });
      }
    }

    return sendJson(res, 503, { error: 'Could not allocate a ticket number. Please retry.' });
  } catch (error) {
    console.error('support ticket request failed:', error);
    return sendJson(res, 500, { error: 'Could not save the support ticket.' });
  }
}

export { toSupportTicket };
