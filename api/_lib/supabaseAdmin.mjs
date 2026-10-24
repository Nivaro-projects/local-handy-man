import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export function sendJson(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Method not allowed.' });
}

export function readJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) return body;
  try {
    if (Buffer.isBuffer(body)) return JSON.parse(body.toString('utf8'));
    if (typeof body === 'string') return JSON.parse(body);
  } catch {
    return null;
  }
  return null;
}

function getBearerToken(req) {
  const header = req.headers?.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the caller's Supabase access token. Returns the auth user, or null
 * after sending a 401/500 response.
 */
export async function requireUser(req, res) {
  if (!supabaseAdmin) {
    sendJson(res, 500, { error: 'Server is not configured for authenticated requests.' });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    sendJson(res, 401, { error: 'Invalid or expired session.' });
    return null;
  }

  return data.user;
}

/**
 * True only for an active role=admin row attached to this auth user. The
 * database is authoritative; JWT metadata and email addresses are never read.
 */
export async function isActiveAdmin(userId) {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('auth_user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

/**
 * Privileged-route guard. Admin identity comes from public.admin_users, never
 * from client-writable JWT metadata.
 */
export async function requireAdmin(req, res) {
  const user = await requireUser(req, res);
  if (!user) return null;

  let isAdmin;
  try {
    isAdmin = await isActiveAdmin(user.id);
  } catch (error) {
    console.error('admin authorization lookup failed:', error);
    sendJson(res, 500, { error: 'Could not verify administrator access.' });
    return null;
  }

  if (!isAdmin) {
    sendJson(res, 403, { error: 'Administrator access required.' });
    return null;
  }

  return user;
}
