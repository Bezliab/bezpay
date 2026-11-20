import rateLimit from 'express-rate-limit';

const make = (max, windowMs = 60_000) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false,
    message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests, slow down.' } });

export const globalLimiter = make(120);
export const resolveLimiter = make(20);
export const initiateLimiter = make(8);
export const webhookLimiter = make(600);
