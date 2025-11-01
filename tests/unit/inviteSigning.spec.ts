import { describe, expect, it } from 'vitest';
import { signInvite, verifyInvite, type InviteTokenPayload } from '@/server/lib/invites/signing';

const secret = 'test-secret';

const basePayload: InviteTokenPayload = {
  kind: 'invite',
  sub: 'user-123',
  propertyId: 456,
  role: 'VIEWER',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
  nonce: 'abcdef',
};

describe('invite signing', () => {
  it('signs and verifies a payload', () => {
    const token = signInvite(basePayload, secret);
    const result = verifyInvite(token, secret);
    expect(result).toMatchObject(basePayload);
  });

  it('rejects tampered payloads', () => {
    const token = signInvite(basePayload, secret);
    const parts = token.split('.');
    const tamperedSignature = parts[2]
      .split('')
      .map((ch, index) => (index === 0 ? (ch === 'a' ? 'b' : 'a') : ch))
      .join('');
    const tampered = `${parts[0]}.${parts[1]}.${tamperedSignature}`;
    expect(() => verifyInvite(tampered, secret)).toThrow('Invite signature mismatch');
  });

  it('rejects expired tokens', () => {
    const expired: InviteTokenPayload = {
      ...basePayload,
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const token = signInvite(expired, secret);
    expect(() => verifyInvite(token, secret)).toThrow('Invite token expired');
  });
});
