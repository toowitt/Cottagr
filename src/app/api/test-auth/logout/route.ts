import { NextResponse } from 'next/server';
import { clearTestAuthCookie, isTestAuthEnabled } from '@/server/lib/testAuth';

export async function POST() {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: 'Not enabled' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  clearTestAuthCookie(response);
  return response;
}
