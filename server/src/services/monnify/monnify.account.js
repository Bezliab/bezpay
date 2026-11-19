// TODO: Implement this module.
import { env } from "../../config/env.js";
import { monnifyRequest } from "./monnify.client.js";
import { toMonnifyDate } from "../../utils/date.js";

export async function validateAccount({ accountNumber, bankCode }) {
  const body = await monnifyRequest({
    method: "GET",
    url: env.MONNIFY_VALIDATE_PATH,
    params: { accountNumber, bankCode },
  });
  return {
    accountNumber: body.accountNumber,
    accountName: body.accountName,
    bankCode: String(body.bankCode ?? bankCode),
  };
}

/**
 * Single-use virtual account via a Dynamic Invoice:
 * one fresh account per invoice, custom accountName, custom expiry.
 */
export async function createDynamicInvoiceAccount({
  reference,
  amount,
  description,
  customerName,
  customerEmail,
  accountName,
  expiresAt,
}) {
  const body = await monnifyRequest({
    method: "POST",
    url: "/api/v1/invoice/create",
    data: {
      amount, // number, NGN
      invoiceReference: reference, // our BZP reference
      description,
      currencyCode: "NGN",
      contractCode: env.MONNIFY_CONTRACT_CODE,
      apiKey: env.MONNIFY_API_KEY, // listed as required in Monnify's invoice docs
      customerName,
      customerEmail,
      accountName, // "<purpose> - BezPay"
      expiryDate: toMonnifyDate(expiresAt),
    },
  });

  return {
    accountNumber: String(body.accountNumber),
    accountName: body.accountName,
    bankName: body.bankName,
    bankCode: String(body.bankCode),
    transactionReference: body.transactionReference ?? null,
    invoiceReference: body.invoiceReference ?? reference,
  };
}
