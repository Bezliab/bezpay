import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Monnify: HMAC-SHA512(clientSecret, raw request body), hex, in `monnify-signature`
export function verifyMonnifySignature(rawBody, signatureHeader) {
  if (!rawBody || !signatureHeader) return false;
  const computed = crypto.createHmac('sha512', env.MONNIFY_SECRET_KEY).update(rawBody).digest('hex');
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(String(signatureHeader).trim().toLowerCase(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
