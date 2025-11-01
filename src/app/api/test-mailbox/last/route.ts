"use server";

import { NextResponse } from 'next/server';
import { getLastTestMail } from '@/server/lib/mailer';

export async function GET() {
  const enabled = process.env.ENABLE_TEST_MAILBOX === 'true' || process.env.ENABLE_TEST_MAILBOX === '1';
  if (!enabled) {
    console.warn('Mailbox endpoint disabled');
    return NextResponse.json({}, { status: 404 });
  }

  const message = getLastTestMail();
  return NextResponse.json(message ? { message } : {});
}
