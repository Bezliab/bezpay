import { pool, withTransaction } from '../config/db.js';
import { sendSingleTransfer, getSingleTransfer } from './monnify/monnify.disbursement.js';

export const MAX_ATTEMPTS = 3;

const SUCCESS = new Set(['SUCCESS', 'COMPLETED']);
const NEEDS_AUTH = new Set(['PENDING_AUTHORIZATION', 'PENDING_BATCH_AUTHORIZATION', 'OTP_EMAIL_DISPATCH_FAILED']);

export function classify(status) {
  const s = String(status || '').toUpperCase();
  if (SUCCESS.has(s)) return 'SUCCESS';
  if (s === 'FAILED') return 'FAILED';
  if (s === 'REVERSED') return 'REVERSED';
  if (NEEDS_AUTH.has(s)) return 'NEEDS_AUTH';
  return 'PENDING'; // PENDING, AWAITING_PROCESSING, IN_PROGRESS, unknown
}

const isNotFound = (err) =>
  err.httpStatus === 404 || /not found|does not exist|no transaction|invalid reference/i.test(err.message || '');

/**
 * Claim in the DB first (row lock + state change + log row), THEN call Monnify.
 * Only one worker can ever win the claim for a given attempt.
 */
export async function initiatePayout(txId) {
  const claim = await withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM transactions WHERE id=? FOR UPDATE', [txId]);
    const tx = rows[0];
    if (!tx || tx.status !== 'INFLOW_CONFIRMED') return null;

    const [cnt] = await conn.execute(
      `SELECT COUNT(*) AS n FROM payout_logs WHERE transaction_id=? AND action='DISBURSE'`, [txId]);
    const attemptNo = Number(cnt[0].n) + 1;

    if (attemptNo > MAX_ATTEMPTS) {
      await conn.execute(
        `UPDATE transactions SET status='FAILED', failure_reason='Payout attempts exhausted' WHERE id=?`, [txId]);
      console.error('[OPS] Payout attempts exhausted: manual action needed', tx.reference);
      return null;
    }

    const payoutReference = attemptNo === 1 ? tx.payout_reference : `${tx.reference}-PO-${attemptNo}`;
    const request = {
      amount: Number(tx.net_amount),
      reference: payoutReference,
      narration: `${tx.purpose} via BezPay`,
      bankCode: tx.recipient_bank_code,
      accountNumber: tx.recipient_account_number,
      accountName: tx.recipient_account_name,
    };

    await conn.execute(
      `UPDATE transactions SET status='PAYOUT_PROCESSING', payout_reference=? WHERE id=?`,
      [payoutReference, txId]);
    const [ins] = await conn.execute(
      `INSERT INTO payout_logs
         (transaction_id, attempt_no, action, payout_reference, amount, status, request_payload)
       VALUES (?,?,'DISBURSE',?,?,'INITIATED',?)`,
      [txId, attemptNo, payoutReference, tx.net_amount, JSON.stringify(request)]);
    return { logId: ins.insertId, payoutReference, request };
  });

  if (!claim) return;
  await dispatch(claim);
}

async function dispatch({ logId, payoutReference, request }) {
  try {
    const body = await sendSingleTransfer(request);
    const outcome = classify(body.status);

    await pool.execute(
      `UPDATE payout_logs
          SET monnify_disbursement_ref=?, fee=?, monnify_status=?, response_payload=?
        WHERE id=?`,
      [body.transactionReference ?? null, body.totalFee ?? body.fee ?? null,
       body.status ?? null, JSON.stringify(body), logId]);

    if (['SUCCESS', 'FAILED', 'REVERSED'].includes(outcome)) {
      await settlePayout({
        payoutReference, outcome, rawStatus: body.status,
        monnifyRef: body.transactionReference, fee: body.totalFee ?? body.fee ?? null,
        source: 'DISBURSE', payload: body,
      });
      return;
    }

    await pool.execute(`UPDATE payout_logs SET status='PENDING' WHERE id=?`, [logId]);
    if (outcome === 'NEEDS_AUTH') {
      console.error('[OPS] Transfer awaiting authorization. Disable MFA on disbursements or authorize manually.', payoutReference);
    }
  } catch (err) {
    // AMBIGUOUS: the transfer may or may not exist. Never mint a new reference here;
    // the requery job decides using the SAME reference.
    console.error('[payout] dispatch exception (ambiguous)', payoutReference, err.message);
    await pool.execute(
      `UPDATE payout_logs SET status='PENDING', response_code=?, error_message=? WHERE id=?`,
      [err.monnifyCode ?? null, `AMBIGUOUS: ${err.message}`.slice(0, 255), logId]);
  }
}

/**
 * Single place where a payout outcome is applied. Called by the dispatch response,
 * the disbursement webhook and the requery job, so all three behave identically.
 */
export async function settlePayout({
  payoutReference, outcome, monnifyRef = null, fee = null, rawStatus = null,
  message = null, source = 'DISBURSE', payload = null,
}) {
  return withTransaction(async (conn) => {
    const [logs] = await conn.execute(
      `SELECT * FROM payout_logs WHERE payout_reference=? AND action='DISBURSE' ORDER BY id DESC LIMIT 1`,
      [payoutReference]);
    const log = logs[0];
    if (!log) return { applied: false, reason: 'Unknown payout reference' };

    const [txs] = await conn.execute('SELECT * FROM transactions WHERE id=? FOR UPDATE', [log.transaction_id]);
    const tx = txs[0];
    const base = { transactionId: tx.id };

    await conn.execute(
      `UPDATE payout_logs
          SET status=?, monnify_status=COALESCE(?, monnify_status),
              monnify_disbursement_ref=COALESCE(?, monnify_disbursement_ref),
              fee=COALESCE(?, fee), error_message=?
        WHERE id=?`,
      [outcome, rawStatus, monnifyRef, fee, message ? String(message).slice(0, 255) : null, log.id]);

    if (source !== 'DISBURSE') {
      await conn.execute(
        `INSERT INTO payout_logs
           (transaction_id, attempt_no, action, payout_reference, monnify_disbursement_ref,
            amount, fee, status, monnify_status, response_payload)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [tx.id, log.attempt_no, source, payoutReference, monnifyRef, log.amount, fee,
         outcome, rawStatus, payload ? JSON.stringify(payload) : null]);
    }

    if (outcome === 'SUCCESS') {
      if (tx.status === 'COMPLETED') {
        if (tx.payout_reference !== payoutReference) {
          console.error('[CRITICAL] Possible DOUBLE PAYOUT: second successful reference', tx.reference, payoutReference);
        }
        return { applied: false, reason: 'Already completed', ...base };
      }
      await conn.execute(
        `UPDATE transactions
            SET status='COMPLETED', completed_at=UTC_TIMESTAMP(), failure_reason=NULL
          WHERE id=?`, [tx.id]);
      return { applied: true, ...base };
    }

    // FAILED or REVERSED: only meaningful for the current attempt of a transaction mid-payout
    if (tx.status !== 'PAYOUT_PROCESSING' || tx.payout_reference !== payoutReference) {
      return { applied: false, reason: 'Stale event or not processing', ...base };
    }

    const retry = outcome === 'FAILED' && log.attempt_no < MAX_ATTEMPTS;
    if (retry) {
      // back to INFLOW_CONFIRMED; the reconcile job re-dispatches with a NEW reference after backoff
      await conn.execute(`UPDATE transactions SET status='INFLOW_CONFIRMED' WHERE id=?`, [tx.id]);
    } else {
      const reason = outcome === 'REVERSED'
        ? 'Payout reversed by the bank: manual review required'
        : `Payout failed after ${log.attempt_no} attempt(s)`;
      await conn.execute(`UPDATE transactions SET status='FAILED', failure_reason=? WHERE id=?`, [reason, tx.id]);
      console.error('[OPS] Funds held, payout not delivered:', tx.reference, reason);
    }
    return { applied: true, retry, ...base };
  });
}

/** Re-query the CURRENT reference and resolve ambiguity. */
export async function requeryPayout({ payout_reference: ref, log_age: logAge }) {
  let body;
  try {
    body = await getSingleTransfer(ref);
  } catch (err) {
    if (isNotFound(err)) {
      // Monnify has no such transfer. After a grace period, treat as "never created" (safe to retry with a new reference)
      if (logAge > 180) {
        await settlePayout({ payoutReference: ref, outcome: 'FAILED', message: 'Transfer never created at Monnify', source: 'REQUERY' });
      }
      return;
    }
    console.error('[requery] error', ref, err.message);
    return;
  }

  const rawStatus = body.status ?? body.transactionStatus;
  const outcome = classify(rawStatus);

  if (outcome === 'PENDING') {
    if (logAge > 30 * 60) console.error('[OPS] Payout pending > 30 min', ref);
    return;
  }
  if (outcome === 'NEEDS_AUTH') {
    console.error('[OPS] Transfer awaiting authorization', ref);
    return;
  }
  await settlePayout({
    payoutReference: ref, outcome, rawStatus,
    monnifyRef: body.transactionReference, fee: body.fee ?? null,
    source: 'REQUERY', payload: body,
  });
}
