import { createHmac, timingSafeEqual } from 'node:crypto';

export type InviteTokenPayload = {
  kind: 'invite';
  sub: string;
  propertyId: number;
  role: string;
  iat: number;
  exp: number;
  nonce: string;
};

const encoder = new TextEncoder();

function base64UrlEncode(data: string | Buffer) {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(data: string) {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = 4 - (normalized.length % 4 || 4);
  return Buffer.from(normalized + '='.repeat(padding), 'base64');
}

export function signInvite(payload: InviteTokenPayload, secret: string): string {
  if (!secret) {
    throw new Error('Invite signing secret is required');
  }

  const header = { alg: 'HS256', typ: 'INVITE' };
  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerEncoded}.${payloadEncoded}`;

  const signature = createHmac('sha256', encoder.encode(secret)).update(data).digest();
  const signatureEncoded = base64UrlEncode(signature);

  return `${data}.${signatureEncoded}`;
}

export function verifyInvite(token: string, secret: string): InviteTokenPayload {
  if (!token) {
    throw new Error('Invite token is required');
  }
  if (!secret) {
    throw new Error('Invite verification secret is required');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid invite token format');
  }

  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = createHmac('sha256', encoder.encode(secret)).update(data).digest();
  const actual = base64UrlDecode(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invite signature mismatch');
  }

  const decodedPayload = JSON.parse(base64UrlDecode(payload).toString()) as InviteTokenPayload;
  if (decodedPayload.kind !== 'invite') {
    throw new Error('Invalid invite token payload');
  }

  const now = Math.floor(Date.now() / 1000);
  if (decodedPayload.exp && decodedPayload.exp < now) {
    throw new Error('Invite token expired');
  }

  return decodedPayload;
}
