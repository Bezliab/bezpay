// TODO: Implement this module.
import { pool } from "../config/db.js";

export async function insertTransaction(t) {
  const [res] = await pool.execute(
    `INSERT INTO transactions
      (reference, payout_reference, sender_name, sender_email, purpose,
       recipient_bank_code, recipient_bank_name, recipient_account_number, recipient_account_name,
       net_amount, bezpay_fee, gateway_inflow_fee, gateway_payout_fee, total_payable, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      t.reference,
      t.payoutReference,
      t.senderName,
      t.senderEmail,
      t.purpose,
      t.bankCode,
      t.bankName,
      t.accountNumber,
      t.accountName,
      t.net,
      t.bezpayFee,
      t.inflowFee,
      t.payoutFee,
      t.total,
      t.expiresAt,
    ],
  );
  return res.insertId;
}

export async function setVirtualAccount(id, va) {
  await pool.execute(
    `UPDATE transactions
        SET va_account_number=?, va_account_name=?, va_bank_name=?, va_bank_code=?,
            monnify_transaction_ref=?, monnify_payment_ref=?
      WHERE id=?`,
    [
      va.accountNumber,
      va.accountName,
      va.bankName,
      va.bankCode,
      va.transactionReference,
      va.invoiceReference,
      id,
    ],
  );
}

export async function markFailed(id, reason) {
  await pool.execute(
    `UPDATE transactions SET status='FAILED', failure_reason=?
      WHERE id=? AND status='PENDING_INFLOW'`,
    [String(reason).slice(0, 255), id],
  );
}

export async function expireIfStale(id) {
  await pool.execute(
    `UPDATE transactions SET status='EXPIRED'
      WHERE id=? AND status='PENDING_INFLOW' AND expires_at < UTC_TIMESTAMP()`,
    [id],
  );
}

export async function findByReference(reference) {
  const [rows] = await pool.execute(
    "SELECT * FROM transactions WHERE reference=? LIMIT 1",
    [reference],
  );
  return rows[0] || null;
}
