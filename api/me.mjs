import {
  isActiveAdmin,
  methodNotAllowed,
  requireUser,
  sendJson,
} from './_lib/supabaseAdmin.mjs';

export function toProfile(user, isAdmin) {
  const role = isAdmin
    ? 'admin'
    : user.app_metadata?.role === 'technician'
      ? 'technician'
      : 'customer';

  return { id: user.id, role };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const isAdmin = await isActiveAdmin(user.id);
    return sendJson(res, 200, toProfile(user, isAdmin));
  } catch (error) {
    console.error('profile role lookup failed:', error);
    return sendJson(res, 500, { error: 'Could not verify account role.' });
  }
}
