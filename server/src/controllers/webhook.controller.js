import { verifyMonnifySignature } from '../utils/hash.js';
import { recordEvent, finishEvent } from '../repositories/webhookEvent.repo.js';
import { buildIdempotencyKey, processEvent } from '../services/webhook.service.js';
import { initiatePayout } from '../services/payout.service.js';

export async function monnifyWebhook(req, res) {
  if (!verifyMonnifySignature(req.rawBody, req.get('monnify-signature'))) {
    console.warn('[webhook] invalid signature from', req.ip);
    return res.status(401).json({ success: false });
  }

  const event = req.body;
  const key = buildIdempotencyKey(event);
  if (!key) return res.status(200).json({ received: true }); // malformed/unsupported: don't make Monnify retry

  const rec = await recordEvent({
    key,
    eventType: event.eventType,
    reference: event.eventData.transactionReference || event.eventData.reference,
    payload: event,
  });

  // Already handled: acknowledge, do nothing
  if (!rec.isNew && ['PROCESSED', 'IGNORED'].includes(rec.status)) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  try {
    const result = await processEvent(event, rec.id);
    res.status(200).json({ received: true });

    // Payout runs AFTER the ack; its claim is already persisted in INFLOW_CONFIRMED
    if (result?.payoutTxId) {
      setImmediate(() =>
        initiatePayout(result.payoutTxId).catch((e) => console.error('[payout] failed to start', e.message)));
    }
  } catch (err) {
    console.error('[webhook] processing error', key, err);
    await finishEvent(rec.id, 'FAILED', { message: err.message }).catch(() => {});
    res.status(500).json({ success: false }); // Monnify retries; row locks + idempotency make it safe
  }
}
