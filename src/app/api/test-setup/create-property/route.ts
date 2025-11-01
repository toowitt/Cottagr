import { NextResponse } from 'next/server';
import { setupCreateProperty } from '@/app/admin/setup/actions';
import { isTestAuthEnabled } from '@/server/lib/testAuth';

export async function POST(request: Request) {
  if (!isTestAuthEnabled()) {
    return NextResponse.json({ error: 'Not enabled' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => formData.append(key, String(entry)));
    } else if (typeof value === 'boolean') {
      if (value) {
        formData.append(key, 'on');
      }
    } else {
      formData.append(key, String(value));
    }
  }

  try {
    await setupCreateProperty(formData);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to create property via test endpoint', error);
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
}
