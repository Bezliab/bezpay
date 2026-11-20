// Sends a signed fake Monnify webhook to your local server.
// Usage: node scripts/send-test-webhook.js [path/to/event.json]
// Send the same event twice to confirm the second response says duplicate: true.
import crypto from 'node:crypto';
import fs from 'node:fs';
import 'dotenv/config';

const file = process.argv[2];
const event = file
  ? JSON.parse(fs.readFileSync(file, 'utf8'))
  : {
      eventType: 'SUCCESSFUL_TRANSACTION',
      eventData: {
        product: { reference: 'REPLACE_WITH_BZP_REFERENCE', type: 'INVOICE' },
        transactionReference: `MNFY|TEST|${Date.now()}`,
        paymentReference: 'REPLACE_WITH_BZP_REFERENCE',
        amountPaid: 1000,
        totalPayable: 1000,
        settlementAmount: '985.00',
        paymentStatus: 'PAID',
        paymentMethod: 'ACCOUNT_TRANSFER',
        currency: 'NGN',
        destinationAccountInformation: { accountNumber: 'REPLACE_WITH_VA_NUMBER' },
        customer: { name: 'Test', email: 'test@example.com' },
      },
    };

const body = JSON.stringify(event);
const sig = crypto.createHmac('sha512', process.env.MONNIFY_SECRET_KEY).update(body).digest('hex');

const res = await fetch(`http://localhost:${process.env.PORT || 5000}/api/webhooks/monnify`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'monnify-signature': sig },
  body,
});
console.log(res.status, await res.text());
