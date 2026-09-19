import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '../../server/session';

export async function POST() {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
