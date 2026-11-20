import { AppError, MonnifyError } from '../utils/errors.js';

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ success: false, code: 'NOT_FOUND', message: 'Route not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, code: err.code, message: err.message });
  }
  if (err instanceof MonnifyError) {
    console.error('[monnify]', err.message, err.monnifyCode, err.httpStatus);
    return res.status(502).json({ success: false, code: 'PROVIDER_ERROR', message: 'Payment provider is unavailable. Try again shortly.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, code: 'BAD_JSON', message: 'Malformed JSON body' });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ success: false, code: 'INTERNAL_ERROR', message: 'Something went wrong' });
}
