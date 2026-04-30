// BenchBoss Coach HQ v0.6.0 — create team invite link
// Requires authenticated Supabase bearer token and manager/coach permission.

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const ALLOWED_ROLES = new Set(['head_coach', 'assistant_coach', 'manager', 'parent', 'player', 'viewer']);
const MANAGER_ROLES = new Set(['owner', 'director', 'head_coach', 'manager']);

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
  const organizationId = clean(body.organizationId, 80);
  const teamId = clean(body.teamId, 80);
  const email = clean(body.email, 240).toLowerCase();
  const role = clean(body.role, 40) || 'parent';
  if (!organizationId || !teamId) return json({ error: 'organizationId and teamId are required' }, 400);
  if (!ALLOWED_ROLES.has(role)) return json({ error: `Unsupported invite role: ${role}` }, 400);

  const admin = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: membership, error: membershipError } = await admin
    .from('memberships')
    .select('role,status')
    .eq('organization_id', organizationId)
    .eq('team_id', teamId)
    .eq('user_id', verified.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError) return json({ error: membershipError.message }, 500);
  if (!membership || !MANAGER_ROLES.has(membership.role)) return json({ error: 'Not authorized to create team invites' }, 403);

  const inviteToken = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invite, error } = await admin.from('team_invites').insert({
    organization_id: organizationId,
    team_id: teamId,
    email: email || null,
    role,
    token: inviteToken,
    status: 'pending',
    expires_at: expiresAt,
    created_by: verified.user.id,
  }).select('*').single();
  if (error) return json({ error: error.message }, 500);

  const appUrl = process.env.PUBLIC_APP_URL || new URL(req.url).origin;
  const inviteUrl = `${appUrl}/auth.html?invite=${encodeURIComponent(inviteToken)}&next=${encodeURIComponent('/parent.html?invite=' + inviteToken)}`;
  return json({ invite, inviteUrl, expiresAt });
};

export const config = { path: '/api/create-team-invite' };
