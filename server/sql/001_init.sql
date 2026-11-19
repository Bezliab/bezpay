-- TODO: Add initial database schema.
CREATE DATABASE IF NOT EXISTS bezpay
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bezpay;

-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
CREATE TABLE transactions (
  id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reference                   VARCHAR(64)  NOT NULL,   -- BezPay public reference (BZP-...)
  payout_reference            VARCHAR(64)  NOT NULL,   -- idempotency key sent to Monnify disbursement

  -- Sender
  sender_name                 VARCHAR(120) NOT NULL,
  sender_email                VARCHAR(190) NOT NULL,

  -- Purpose
  purpose                     VARCHAR(80)  NOT NULL,

  -- Recipient (Mr. B)
  recipient_bank_code         VARCHAR(10)  NOT NULL,
  recipient_bank_name         VARCHAR(120) NOT NULL,
  recipient_account_number    CHAR(10)     NOT NULL,
  recipient_account_name      VARCHAR(190) NOT NULL,   -- as resolved by Monnify

  -- Money (all NGN)
  net_amount                  DECIMAL(15,2) NOT NULL,  -- what Mr. B receives
  bezpay_fee                  DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gateway_inflow_fee          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  gateway_payout_fee          DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_payable               DECIMAL(15,2) NOT NULL,  -- what Mr. A must transfer
  amount_paid                 DECIMAL(15,2) NULL,      -- actual inflow reported by Monnify
  settled_amount              DECIMAL(15,2) NULL,      -- Monnify settlementAmount (after their fee)
  overpaid_amount             DECIMAL(15,2) NOT NULL DEFAULT 0.00,

  -- Virtual account (Monnify)
  va_account_number           VARCHAR(20)  NULL,
  va_account_name             VARCHAR(190) NULL,       -- "<purpose> - BezPay"
  va_bank_name                VARCHAR(120) NULL,
  va_bank_code                VARCHAR(10)  NULL,
  monnify_transaction_ref     VARCHAR(100) NULL,       -- Monnify's transactionReference
  monnify_payment_ref         VARCHAR(100) NULL,       -- our paymentReference sent to Monnify

  -- State
  status ENUM(
      'PENDING_INFLOW',
      'INFLOW_CONFIRMED',
      'PAYOUT_PROCESSING',
      'COMPLETED',
      'FAILED',
      'UNDERPAID',
      'EXPIRED'
  ) NOT NULL DEFAULT 'PENDING_INFLOW',
  failure_reason              VARCHAR(255) NULL,

  -- Timestamps
  expires_at                  DATETIME NOT NULL,       -- created_at + 40 min
  paid_at                     DATETIME NULL,
  completed_at                DATETIME NULL,
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_tx_reference          (reference),
  UNIQUE KEY uq_tx_payout_reference   (payout_reference),
  UNIQUE KEY uq_tx_monnify_tx_ref     (monnify_transaction_ref),
  UNIQUE KEY uq_tx_monnify_payment_ref(monnify_payment_ref),
  KEY idx_tx_va_account               (va_account_number),
  KEY idx_tx_status_expires           (status, expires_at),
  KEY idx_tx_sender_email             (sender_email),
  KEY idx_tx_created_at               (created_at),

  CONSTRAINT chk_tx_amounts CHECK (
    net_amount > 0 AND total_payable >= net_amount
  )
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- payout_logs  (one row per disbursement attempt / requery)
-- ------------------------------------------------------------
CREATE TABLE payout_logs (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id         BIGINT UNSIGNED NOT NULL,
  attempt_no             SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  action                 ENUM('DISBURSE','REQUERY','WEBHOOK_CONFIRM') NOT NULL,

  payout_reference       VARCHAR(64)  NOT NULL,        -- same reference across retries (idempotent)
  monnify_disbursement_ref VARCHAR(100) NULL,

  amount                 DECIMAL(15,2) NOT NULL,
  fee                    DECIMAL(15,2) NULL,

  status ENUM(
      'INITIATED',
      'PENDING',
      'SUCCESS',
      'FAILED',
      'REVERSED'
  ) NOT NULL DEFAULT 'INITIATED',

  monnify_status         VARCHAR(40)  NULL,            -- raw: SUCCESS, PENDING, FAILED, OTP_EMAIL_DISPATCH_FAILED...
  response_code          VARCHAR(20)  NULL,
  error_message          VARCHAR(255) NULL,
  request_payload        JSON NULL,
  response_payload       JSON NULL,

  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_pl_tx            (transaction_id, attempt_no),
  KEY idx_pl_payout_ref    (payout_reference),
  KEY idx_pl_status        (status, created_at),
  CONSTRAINT fk_pl_tx FOREIGN KEY (transaction_id)
      REFERENCES transactions(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- webhook_events  (raw inbox + idempotency)
-- ------------------------------------------------------------
CREATE TABLE webhook_events (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  idempotency_key   VARCHAR(190) NOT NULL,   -- e.g. "SUCCESSFUL_TRANSACTION:<monnify transactionReference>"
  event_type        VARCHAR(60)  NOT NULL,   -- SUCCESSFUL_TRANSACTION, SUCCESSFUL_DISBURSEMENT, FAILED_DISBURSEMENT, ...
  monnify_reference VARCHAR(100) NULL,
  transaction_id    BIGINT UNSIGNED NULL,    -- resolved after lookup
  signature_valid   TINYINT(1)   NOT NULL DEFAULT 0,

  processing_status ENUM('RECEIVED','PROCESSED','IGNORED','FAILED')
                    NOT NULL DEFAULT 'RECEIVED',
  error_message     VARCHAR(255) NULL,
  payload           JSON NOT NULL,

  received_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at      DATETIME NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_we_idempotency (idempotency_key),
  KEY idx_we_tx        (transaction_id),
  KEY idx_we_type      (event_type, received_at),
  KEY idx_we_status    (processing_status),
  CONSTRAINT fk_we_tx FOREIGN KEY (transaction_id)
      REFERENCES transactions(id) ON DELETE SET NULL
) ENGINE=InnoDB;