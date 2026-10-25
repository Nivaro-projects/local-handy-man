import {
  methodNotAllowed,
  readJsonBody,
  requireAdmin,
  sendJson,
  supabaseAdmin,
} from '../../_lib/supabaseAdmin.mjs';
import { toSupportTicket } from '../tickets.mjs';

const SUPPORT_STATUSES = new Set(['Open', 'In Review', 'Resolved']);
const TICKET_ID_PATTERN = /^TKT-\d{4}-\d{4,6}$/;
const MAX_NOTE = 5000;

function getTicketId(req) {
  const raw = req.query?.id;
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) return String(raw[0] ?? '').trim();

  const path = String(req.url ?? '').split('?')[0];
  return decodeURIComponent(path.split('/').pop() ?? '').trim();
}

export function parseTicketUpdate(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'A JSON request body is required.' };
  }

  const status = typeof body.status === 'string' ? body.status.trim() : '';
  if (status && !SUPPORT_STATUSES.has(status)) {
    return { error: 'Invalid ticket status.' };
  }

  const hasNote = body.resolutionNote !== undefined || body.resolutionNotes !== undefined;
  const rawNote = body.resolutionNote ?? body.resolutionNotes;
  if (hasNote && typeof rawNote !== 'string') {
    return { error: 'Resolution note must be text.' };
  }

  const resolutionNote = hasNote ? rawNote.trim() : undefined;
  if (resolutionNote && resolutionNote.length > MAX_NOTE) {
    return { error: `Resolution note must be at most ${MAX_NOTE} characters.` };
  }

  if (!status && !hasNote) {
    return { error: 'Provide a status or a resolution note.' };
  }

  return { value: { status: status || undefined, hasNote, resolutionNote } };
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return methodNotAllowed(res, ['PATCH']);
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const ticketId = getTicketId(req);
  if (!TICKET_ID_PATTERN.test(ticketId)) {
    return sendJson(res, 400, { error: 'Invalid ticket reference.' });
  }

  const parsed = parseTicketUpdate(readJsonBody(req));
  if (parsed.error) {
    return sendJson(res, 400, { error: parsed.error });
  }

  const update = {};
  if (parsed.value.status) update.status = parsed.value.status;
  if (parsed.value.hasNote) update.resolution_note = parsed.value.resolutionNote || null;

  try {
    const { data: currentTicket, error: currentError } = await supabaseAdmin
      .from('support_tickets')
      .select('id, status, resolution_note')
      .eq('id', ticketId)
      .maybeSingle();

    if (currentError) {
      console.error('support ticket lookup failed:', currentError);
      return sendJson(res, 500, { error: 'Could not update the support ticket.' });
    }
    if (!currentTicket) {
      return sendJson(res, 404, { error: 'Support ticket not found.' });
    }

    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .update(update)
      .eq('id', ticketId)
      .select('*');

    if (error) {
      console.error('support ticket update failed:', error);
      return sendJson(res, 500, { error: 'Could not update the support ticket.' });
    }
    if (!data?.length) {
      return sendJson(res, 404, { error: 'Support ticket not found.' });
    }

    const updatedTicket = data[0];

    try {
      const { error: auditError } = await supabaseAdmin
        .from('audit_log')
        .insert({
          actor_id: admin.id,
          action: 'UPDATE_SUPPORT_TICKET_STATUS',
          entity_name: 'support_tickets',
          entity_id: ticketId,
          before_state: {
            status: currentTicket.status,
            resolution_note: currentTicket.resolution_note ?? null,
          },
          after_state: {
            status: updatedTicket.status,
            resolution_note: updatedTicket.resolution_note ?? null,
          },
        });

      if (auditError) {
        console.error('support ticket audit insert failed:', auditError);
      }
    } catch (auditError) {
      // The update already succeeded; do not turn a logging failure into a
      // client-visible update failure.
      console.error('support ticket audit insert failed:', auditError);
    }

    return sendJson(res, 200, toSupportTicket(updatedTicket));
  } catch (error) {
    console.error('support ticket update request failed:', error);
    return sendJson(res, 500, { error: 'Could not update the support ticket.' });
  }
}
