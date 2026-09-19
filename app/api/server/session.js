import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabaseAdmin';

const COOKIE = 'b_reddy_session';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  const { error } = await supabaseAdmin.from('app_sessions').insert({ user_id: userId, token_hash: tokenHash, expires_at: expires });
  if (error) throw new Error(error.message);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: new Date(expires) });
  return expires;
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await supabaseAdmin
    .from('app_sessions')
    .select('id,user_id,expires_at,app_users(id,full_name,email,role,receiver_id,status,receivers(receiver_name))')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (error || !data?.app_users?.status) return null;
  return { sessionId: data.id, ...data.app_users };
}

export async function destroyCurrentSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await supabaseAdmin.from('app_sessions').delete().eq('token_hash', hashToken(token));
  jar.delete(COOKIE);
}
