import { pool } from '../config/db.js';
import { initiatePayout, requeryPayout } from '../services/payout.service.js';

export async function runReconciliation() {
  // 1. Expire unpaid transactions
  await pool.execute(
    `UPDATE transactions SET status='EXPIRED' WHERE status='PENDING_INFLOW' AND expires_at < UTC_TIMESTAMP()`);

  // 2. Paid but payout not (re)started: initial dispatch or retry after backoff
  const [due] = await pool.execute(
    `SELECT t.id,
            (SELECT COUNT(*) FROM payout_logs p WHERE p.transaction_id=t.id AND p.action='DISBURSE') AS attempts,
            TIMESTAMPDIFF(SECOND, t.updated_at, UTC_TIMESTAMP()) AS idle
       FROM transactions t
      WHERE t.status='INFLOW_CONFIRMED' AND t.updated_at < UTC_TIMESTAMP() - INTERVAL 30 SECOND
      LIMIT 50`);
  for (const r of due) {
    const attempts = Number(r.attempts);
    const backoff = attempts === 0 ? 30 : 60 * 2 ** attempts; // 2, 4 min
    if (Number(r.idle) >= backoff) await initiatePayout(r.id);
  }

  // 3. Payouts in flight with no final answer yet
  const [stuck] = await pool.execute(
    `SELECT t.id, t.payout_reference,
            (SELECT TIMESTAMPDIFF(SECOND, MAX(p.created_at), UTC_TIMESTAMP())
               FROM payout_logs p WHERE p.transaction_id=t.id AND p.action='DISBURSE') AS log_age
       FROM transactions t
      WHERE t.status='PAYOUT_PROCESSING' AND t.updated_at < UTC_TIMESTAMP() - INTERVAL 90 SECOND
      LIMIT 50`);
  for (const r of stuck) await requeryPayout({ payout_reference: r.payout_reference, log_age: Number(r.log_age ?? 0) });
}
