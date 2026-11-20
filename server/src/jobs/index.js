import { pool } from '../config/db.js';
import { runReconciliation } from './reconcile.job.js';

export function startJobs() {
  const tick = async () => {
    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query("SELECT GET_LOCK('bezpay_reconcile', 0) AS got");
      if (!rows[0].got) return;
      try { await runReconciliation(); }
      finally { await conn.query("SELECT RELEASE_LOCK('bezpay_reconcile')"); }
    } catch (err) {
      console.error('[jobs] reconcile failed', err.message);
    } finally {
      conn.release();
    }
  };
  setInterval(tick, 60_000).unref();
}
