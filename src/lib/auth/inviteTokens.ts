import crypto from 'node:crypto';

export const generateInviteToken = () => crypto.randomBytes(32).toString('base64url');

export const calculateInviteExpiry = (days = 7) => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};
