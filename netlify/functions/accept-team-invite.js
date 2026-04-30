// BenchBoss Coach HQ v0.6.0 — accept team invite link
// Creates/updates an active membership for the signed-in user.

import { createClient } from '@supabase/supabase-js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
function clean(value, max = 500) { return String(value || '').trim().slice(0, max); }
function getBearer(req) {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}
async function verifyUser(req) {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const token = getBearer(req);
  if (!supabaseUrl || !anonKey) return { error: 'Supabase env vars missing', status: 501 };
  if (!token) return { error: 'Missing Authorization bearer token', status: 401 };
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { error: 'Invalid session', status: 401 };
  return { user: data.user };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const verified = await verifyUser(req);
  if (verified.error) return json({ error: verified.error }, verified.status);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY missing' }, 501);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
  const token = clean(body.token, 200);
  if (!token) return json({ error: 'Invite token is required' }, 400);

  const admin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: invite, error: inviteError } = await admin.from('team_invites').select('*').eq('token', token).maybeSingle();
  if (inviteError) return json({ error: inviteError.message }, 500);
  if (!invite) return json({ error: 'Invite not found' }, 404);
  if (invite.status !== 'pending') return json({ error: `Invite is ${invite.status}` }, 409);
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin.from('team_invites').update({ status: 'expired' }).eq('id', invite.id);
    return json({ error: 'Invite expired' }, 410);
  }
  if (invite.email && verified.user.email && invite.email.toLowerCase() !== verified.user.email.toLowerCase()) {
    return json({ error: 'This invite is assigned to a different email address' }, 403);
  }

  const { data: existing, error: existingError } = await admin
    .from('memberships')
    .select('*')
    .eq('organization_id', invite.organization_id)
    .eq('team_id', invite.team_id)
    .eq('user_id', verified.user.id)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, 500);

  let membership;
  if (existing) {
    const { data, error } = await admin.from('memberships').update({ role: invite.role, status: 'active', updated_at: new Date().toISOString() }).eq('id', existing.id).select('*').single();
    if (error) return json({ error: error.message }, 500);
    membership = data;
  } else {
    const { data, error } = await admin.from('memberships').insert({
      organization_id: invite.organization_id,
      team_id: invite.team_id,
      user_id: verified.user.id,
      role: invite.role,
      status: 'active',
      created_by: invite.created_by || verified.user.id,
    }).select('*').single();
    if (error) return json({ error: error.message }, 500);
    membership = data;
  }

  await admin.from('team_invites').update({ status: 'accepted', accepted_by: verified.user.id, accepted_at: new Date().toISOString() }).eq('id', invite.id);
  return json({ membership, teamId: invite.team_id, organizationId: invite.organization_id });
};

export const config = { path: '/api/accept-team-invite' };
