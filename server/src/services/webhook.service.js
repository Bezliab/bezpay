import { withTransaction } from '../config/db.js';
import { lockByInflowKeys } from '../repositories/transaction.repo.js';
import { finishEvent } from '../repositories/webhookEvent.repo.js';
import { settlePayout } from './payout.service.js';
import { toKobo, fromKobo } from '../utils/money.js';

const PAID_STATUSES = new Set(['PAID', 'OVERPAID', 'PARTIALLY_PAID']);

export function buildIdempotencyKey(event) {
  const d = event?.eventData || {};
  const ref = d.transactionReference || d.reference;
  return event?.eventType && ref ? `${event.eventType}:${ref}` : null;
}

export async function processEvent(event, eventId) {
  switch (event.eventType) {
    case 'SUCCESSFUL_TRANSACTION':
      return handleInflow(event.eventData, eventId);
    case 'SUCCESSFUL_DISBURSEMENT':
    case 'FAILED_DISBURSEMENT':
    case 'REVERSED_DISBURSEMENT':
      return handleDisbursement(event, eventId);
    default:
      await finishEvent(eventId, 'IGNORED', { message: `Unhandled event ${event.eventType}` });
      return null;
  }
}

async function handleInflow(d, eventId) {
  return withTransaction(async (conn) => {
    const tx = await lockByInflowKeys(conn, {
      refs: [d.paymentReference, d.product?.reference],
      vaAccount: d.destinationAccountInformation?.accountNumber,
    });

    if (!tx) {
      console.error('[OPS] Inflow for unknown transaction: manual reconciliation needed', d.transactionReference);
      await finishEvent(eventId, 'IGNORED', { message: 'Unknown reference', conn });
      return null;
    }
    if (!PAID_STATUSES.has(d.paymentStatus)) {
      await finishEvent(eventId, 'IGNORED', { transactionId: tx.id, message: `paymentStatus=${d.paymentStatus}`, conn });
      return null;
    }
    // A sufficient payment landing right at the expiry boundary is still honored
    if (!['PENDING_INFLOW', 'EXPIRED'].includes(tx.status)) {
      console.error('[OPS] Inflow for transaction already in state', tx.status, tx.reference);
      await finishEvent(eventId, 'IGNORED', { transactionId: tx.id, message: `Already ${tx.status}`, conn });
      return null;
    }

    const paid = toKobo(d.amountPaid);
    const expected = toKobo(tx.total_payable);
    const settled = d.settlementAmount != null ? fromKobo(toKobo(d.settlementAmount)) : null;

    if (paid < expected) {
      await conn.execute(
        `UPDATE transactions
            SET status='UNDERPAID', amount_paid=?, settled_amount=?, paid_at=UTC_TIMESTAMP(),
                monnify_transaction_ref=COALESCE(monnify_transaction_ref, ?),
                failure_reason=?
          WHERE id=?`,
        [fromKobo(paid), settled, d.transactionReference ?? null,
         `Underpaid: expected ${fromKobo(expected)}, received ${fromKobo(paid)}`, tx.id]);
      console.error('[OPS] UNDERPAID: manual refund required', tx.reference);
      await finishEvent(eventId, 'PROCESSED', { transactionId: tx.id, message: 'Underpaid', conn });
      return null; // no payout
    }

    await conn.execute(
      `UPDATE transactions
          SET status='INFLOW_CONFIRMED', amount_paid=?, settled_amount=?, overpaid_amount=?,
              paid_at=UTC_TIMESTAMP(), failure_reason=NULL,
              monnify_transaction_ref=COALESCE(monnify_transaction_ref, ?)
        WHERE id=? AND status IN ('PENDING_INFLOW','EXPIRED')`,
      [fromKobo(paid), settled, fromKobo(paid - expected), d.transactionReference ?? null, tx.id]);

    await finishEvent(eventId, 'PROCESSED', { transactionId: tx.id, conn });
    return { payoutTxId: tx.id };
  });
}

async function handleDisbursement(event, eventId) {
  const d = event.eventData;
  const outcome = { SUCCESSFUL_DISBURSEMENT: 'SUCCESS', FAILED_DISBURSEMENT: 'FAILED', REVERSED_DISBURSEMENT: 'REVERSED' }[event.eventType];
  const result = await settlePayout({
    payoutReference: d.reference,
    outcome,
    monnifyRef: d.transactionReference,
    fee: d.fee ?? null,
    rawStatus: d.status,
    message: d.transactionDescription,
    source: 'WEBHOOK_CONFIRM',
    payload: d,
  });
  await finishEvent(eventId, result?.applied ? 'PROCESSED' : 'IGNORED', {
    transactionId: result?.transactionId ?? null,
    message: result?.reason ?? null,
  });
  return null;
}
