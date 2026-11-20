import { env } from '../../config/env.js';
import { monnifyRequest } from './monnify.client.js';

export function sendSingleTransfer({ amount, reference, narration, bankCode, accountNumber, accountName }) {
  return monnifyRequest({
    method: 'POST',
    url: '/api/v2/disbursements/single',
    data: {
      amount,
      reference,
      narration,
      destinationBankCode: bankCode,
      destinationAccountNumber: accountNumber,
      destinationAccountName: accountName, // now mandatory; fuzzy-matched by Monnify
      currency: 'NGN',
      sourceAccountNumber: env.MONNIFY_WALLET_ACCOUNT_NUMBER,
      async: true, // return PENDING fast; webhook/requery finalizes
    },
  });
}

export function getSingleTransfer(reference) {
  return monnifyRequest({
    method: 'GET',
    url: '/api/v2/disbursements/single/summary',
    params: { reference },
  });
}
