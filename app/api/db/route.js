import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/server/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role, receiver_id: user.receiver_id, receivers: user.receivers || null } });
}
