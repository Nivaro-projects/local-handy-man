import {
  methodNotAllowed,
  requireUser,
  sendJson,
  supabaseAdmin,
} from '../_lib/supabaseAdmin.mjs';
import { toSupportTicket } from './tickets.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    // The session decides the customer; no client-supplied id is accepted.
    const { data, error } = await supabaseAdmin
      .from('support_tickets')
      .select(
        'id, booking_id, customer_id, customer_name, customer_phone, issue_type, description, status, resolution_note, created_at'
      )
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('customer support ticket list failed:', error);
      return sendJson(res, 500, { error: 'Could not load support tickets.' });
    }

    return sendJson(res, 200, { tickets: (data ?? []).map(toSupportTicket) });
  } catch (error) {
    console.error('customer support ticket request failed:', error);
    return sendJson(res, 500, { error: 'Could not load support tickets.' });
  }
}
