import { Router } from 'express';
import { monnifyWebhook } from '../controllers/webhook.controller.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { webhookLimiter } from '../middlewares/rateLimiter.js';

const r = Router();
r.post('/monnify', webhookLimiter, asyncHandler(monnifyWebhook));
export default r;
