# BezPay

Automated pass-through payments for Nigeria. A sender pays a single-use Monnify virtual account; the backend verifies the webhook and disburses the net amount to the recipient's bank account.

```
bezpay/
├── client/   React (Vite) + Tailwind + Lucide + Axios
└── server/   Node + Express + MySQL + Monnify
```

## Quick start

### 1. Database
```bash
mysql -u root -p < server/sql/001_init.sql
```

### 2. Server
```bash
cd server
cp .env.example .env     # fill in DB + Monnify credentials
npm install
npm run dev              # http://localhost:5000
```

### 3. Client
```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173 (proxies /api to :5000)
```

### 4. Webhooks (sandbox)
Expose the server (e.g. `ngrok http 5000`) and set both the collection and disbursement webhook URLs in the Monnify dashboard to:

```
https://<your-tunnel>/api/webhooks/monnify
```

Test signature + idempotency offline: `node server/scripts/send-test-webhook.js` (send twice; the second reply says `duplicate: true`).

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/banks` | Nigerian banks |
| POST | `/api/resolve-account` | Validate NUBAN, return account name |
| POST | `/api/transactions/initiate` | Create transaction + single-use virtual account |
| GET | `/api/transactions/:reference` | Status polling |
| POST | `/api/webhooks/monnify` | Monnify events (HMAC-SHA512 verified) |

## Before going live

1. **Account naming/expiry:** the virtual account is created via Monnify Dynamic Invoicing so it supports a 40-minute expiry. Confirm in sandbox that `"<purpose> - BezPay"` displays as expected.
2. **Disbursement MFA must be off**, otherwise every payout waits for an OTP.
3. **Fund the disbursement wallet.** Payouts debit your wallet, not the inflow directly. Ask Monnify how and when collections reach it.
4. **Check the first sandbox invoice webhook payload** matches the matcher in `server/src/services/webhook.service.js`.
5. **Verify fee rates** in `server/.env` / `server/src/config/fees.js` against your Monnify contract.
6. Wire the `[OPS]` / `[CRITICAL]` console alerts to email or Slack (underpaid, failed payout, possible double payout).
7. Confirm the regulatory position of holding/forwarding third-party funds with Monnify and a Nigerian fintech lawyer.
8. Production: serve over HTTPS, rewrite unknown paths to `index.html` for `/t/:reference`, set `VITE_API_BASE_URL` and the server's `CLIENT_ORIGIN`.

## Payout safety model

- Webhook signature checked on the raw body; `webhook_events.idempotency_key` is unique.
- Transaction rows are locked `FOR UPDATE`; the payout claim is committed before Monnify is called.
- Each payout attempt uses a unique reference; a new one is minted only after Monnify confirms the previous attempt failed. Timeouts and 5xx errors are treated as ambiguous and requeried on the same reference.
- A reconcile job (every 60s) expires stale transactions, resumes stuck payouts and requeries in-flight ones.
