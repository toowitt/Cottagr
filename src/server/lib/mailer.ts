type MailMessage = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  metadata?: Record<string, unknown>;
};

export type StoredMailMessage = MailMessage & {
  id: string;
  sentAt: string;
};

const globalForMailer = globalThis as unknown as { __cottagrTestMailbox?: StoredMailMessage[] };
const testMailbox: StoredMailMessage[] = globalForMailer.__cottagrTestMailbox ?? [];
if (!globalForMailer.__cottagrTestMailbox) {
  globalForMailer.__cottagrTestMailbox = testMailbox;
}
const TEST_MODE = process.env.ENABLE_TEST_MAILBOX === 'true' || process.env.ENABLE_TEST_MAILBOX === '1';

function storeTestMail(message: MailMessage) {
  const stored: StoredMailMessage = {
    ...message,
    id: `test-${Date.now()}-${testMailbox.length + 1}`,
    sentAt: new Date().toISOString(),
  };

  const token = typeof stored.metadata?.inviteToken === 'string' ? stored.metadata.inviteToken : null;
  if (token) {
    const existingIndex = testMailbox.findIndex((item) => item.metadata?.inviteToken === token);
    if (existingIndex >= 0) {
      testMailbox[existingIndex] = stored;
      return stored;
    }
  }

  testMailbox.push(stored);
  return stored;
}

export async function sendMail(message: MailMessage) {
  if (TEST_MODE) {
    return storeTestMail(message);
  }

  console.info('Mail dispatch (noop)', {
    to: message.to,
    subject: message.subject,
  });

  return {
    ...message,
    id: `noop-${Date.now()}`,
    sentAt: new Date().toISOString(),
  };
}

export function getTestMailbox(): StoredMailMessage[] {
  return TEST_MODE ? [...testMailbox] : [];
}

export function getLastTestMail(): StoredMailMessage | null {
  if (!TEST_MODE || testMailbox.length === 0) {
    return null;
  }
  return testMailbox[testMailbox.length - 1] ?? null;
}

export function clearTestMailbox() {
  if (TEST_MODE) {
    testMailbox.length = 0;
  }
}

export function pushTestMail(
  to: string,
  token: string,
  options: {
    subject?: string;
    text?: string;
    html?: string;
    metadata?: Record<string, unknown>;
  } = {},
) {
  if (!TEST_MODE) {
    return null;
  }

  const message: MailMessage = {
    to,
    subject: options.subject ?? `Test mail to ${to}`,
    text: options.text,
    html: options.html,
    metadata: {
      inviteToken: token,
      to,
      ...(options.metadata ?? {}),
    },
  };

  return storeTestMail(message);
}
