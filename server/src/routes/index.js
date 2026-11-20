import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { resolveLimiter, initiateLimiter } from '../middlewares/rateLimiter.js';
import { listBanks, resolveAccount } from '../controllers/bank.controller.js';
import { initiate, getByReference } from '../controllers/transaction.controller.js';
import { REFERENCE_REGEX } from '../utils/reference.js';

const bankCode = z.string().regex(/^\d{3,6}$/, 'Invalid bank code');
const accountNumber = z.string().regex(/^\d{10}$/, 'Account number must be 10 digits');

const resolveSchema = z.object({ bankCode, accountNumber });

const initiateSchema = z.object({
  bankCode,
  accountNumber,
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).positive(),
  purpose: z.string().trim().min(3, 'Purpose is too short').max(40, 'Purpose is too long')
    .regex(/^[A-Za-z0-9 &.,'/()-]+$/, 'Purpose contains unsupported characters'),
  senderName: z.string().trim().min(2).max(120),
  senderEmail: z.string().trim().toLowerCase().email().max(190),
});

const refParam = z.object({ reference: z.string().regex(REFERENCE_REGEX, 'Invalid reference') });

const r = Router();
r.get('/health', (req, res) => res.json({ ok: true }));
r.get('/banks', asyncHandler(listBanks));
r.post('/resolve-account', resolveLimiter, validate(resolveSchema), asyncHandler(resolveAccount));
r.post('/transactions/initiate', initiateLimiter, validate(initiateSchema), asyncHandler(initiate));
r.get('/transactions/:reference', validate(refParam, 'params'), asyncHandler(getByReference));
export default r;
