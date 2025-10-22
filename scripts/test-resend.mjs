#!/usr/bin/env node
/**
 * Minimal Resend smoke test: sends a single email and reports success/failure.
 * Uses MAIL_FROM as the sender and MAIL_REPLY_TO as the recipient so the message
 * loops back to your own inbox.
 */
import { setTimeout as sleep } from 'node:timers/promises';

const required = [
  'RESEND_API_KEY',
  'MAIL_FROM',
  'MAIL_REPLY_TO',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

async function sendTestEmail() {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_REPLY_TO,
      subject: 'Cottagr Resend smoke test',
      text: 'This is a one-time test email triggered from scripts/test-resend.mjs.',
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API ${response.status}: ${details}`);
  }

  const payload = await response.json();
  return payload;
}

(async () => {
  try {
    console.log('Sending Resend smoke-test email...');
    const result = await sendTestEmail();
    // Resend may take a couple of seconds to accept the email fully.
    await sleep(500);
    console.log('Resend accepted message id:', result.id ?? '(no id returned)');
    console.log('Check the inbox for', process.env.MAIL_REPLY_TO);
  } catch (err) {
    console.error('Resend test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
