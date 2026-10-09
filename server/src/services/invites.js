import { randomBytes, createHash } from 'node:crypto';

export const hashInviteToken = token => createHash('sha256').update(token).digest('hex');
export function createInviteCredentials(now = Date.now()) {
  const token = randomBytes(32).toString('hex');
  return { token, tokenHash: hashInviteToken(token), expiresAt: new Date(new Date(now).getTime() + 7 * 24 * 60 * 60 * 1000) };
}
