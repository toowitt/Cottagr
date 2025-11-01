import { NextResponse } from 'next/server';
import { clearTestMailbox, getTestMailbox } from '@/server/lib/mailer';

const isMailboxEnabled = () => {
  const flag = process.env.ENABLE_TEST_MAILBOX ?? '';
  return flag === 'true' || flag === '1';
};

export async function GET() {
  if (!isMailboxEnabled()) {
    console.warn('Mailbox endpoint disabled');
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  return NextResponse.json({ messages: getTestMailbox() });
}

export async function DELETE() {
  if (!isMailboxEnabled()) {
    console.warn('Mailbox endpoint disabled');
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  clearTestMailbox();
  return NextResponse.json({ ok: true });
}
