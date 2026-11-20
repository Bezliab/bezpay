import { pool } from '../config/db.js';

export async function recordEvent({ key, eventType, reference, payload }) {
  const [res] = await pool.execute(
    `INSERT IGNORE INTO webhook_events
       (idempotency_key, event_type, monnify_reference, signature_valid, payload)
     VALUES (?,?,?,1,?)`,
    [key, eventType, reference ?? null, JSON.stringify(payload)]
  );
  if (res.affectedRows === 1) return { isNew: true, id: res.insertId, status: 'RECEIVED' };
  const [rows] = await pool.execute(
    'SELECT id, processing_status FROM webhook_events WHERE idempotency_key=?', [key]);
  return { isNew: false, id: rows[0].id, status: rows[0].processing_status };
}

export async function finishEvent(id, status, { transactionId = null, message = null, conn = pool } = {}) {
  await conn.execute(
    `UPDATE webhook_events
        SET processing_status=?, transaction_id=COALESCE(?, transaction_id),
            error_message=?, processed_at=UTC_TIMESTAMP()
      WHERE id=?`,
    [status, transactionId, message ? String(message).slice(0, 255) : null, id]
  );
}
