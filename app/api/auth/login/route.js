import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/server/supabaseAdmin';
import { createSession } from '../../../../lib/server/session';

export async function POST(request) {
  try {
    const { email, password, role } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Enter email and password.' }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from('app_users')
      .select('id,full_name,email,role,receiver_id,status,receivers(receiver_name),password_hash')
      .eq('email', String(email).trim().toLowerCase())
      .eq('status', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    const { data: ok, error: verifyError } = await supabaseAdmin.rpc('verify_app_password', { p_password: password, p_password_hash: data.password_hash });
    if (verifyError) throw new Error(verifyError.message);
    if (!ok) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    if (role && data.role !== role) return NextResponse.json({ error: `This account is configured as ${data.role}. Please select the correct login.` }, { status: 403 });
    await createSession(data.id);
    return NextResponse.json({ user: { id: data.id, full_name: data.full_name, email: data.email, role: data.role, receiver_id: data.receiver_id, receivers: data.receivers || null } });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Login failed.' }, { status: 500 });
  }
}
