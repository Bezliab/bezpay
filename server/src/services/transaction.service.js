// TODO: Implement this module.
import { feeConfig } from "../config/fees.js";
import { computeFees } from "./fee.service.js";
import { findBank } from "./monnify/monnify.banks.js";
import {
  validateAccount,
  createDynamicInvoiceAccount,
} from "./monnify/monnify.account.js";
import * as repo from "../repositories/transaction.repo.js";
import { newReferences } from "../utils/reference.js";
import {
  toKobo,
  fromKobo,
  koboToNumber,
  hasMoreThan2dp,
} from "../utils/money.js";
import { AppError, MonnifyError } from "../utils/errors.js";

const mask = (n) => `${n.slice(0, 3)}****${n.slice(-3)}`;

export function toPublicDto(tx) {
  const pending = tx.status === "PENDING_INFLOW";
  return {
    reference: tx.reference,
    purpose: tx.purpose,
    status: tx.status,
    failureReason:
      tx.status === "FAILED" ? "Transaction could not be completed" : null,
    senderName: tx.sender_name,
    recipient: {
      bankName: tx.recipient_bank_name,
      accountName: tx.recipient_account_name,
      accountNumber: mask(tx.recipient_account_number),
    },
    amounts: {
      net: tx.net_amount,
      bezpayFee: tx.bezpay_fee,
      gatewayFees: fromKobo(
        toKobo(tx.gateway_inflow_fee) + toKobo(tx.gateway_payout_fee),
      ),
      totalPayable: tx.total_payable,
      amountPaid: tx.amount_paid,
    },
    // payment details only shown while they're still useful
    virtualAccount:
      pending && tx.va_account_number
        ? {
            accountNumber: tx.va_account_number,
            accountName: tx.va_account_name,
            bankName: tx.va_bank_name,
          }
        : null,
    expiresAt: tx.expires_at,
    paidAt: tx.paid_at,
    completedAt: tx.completed_at,
    createdAt: tx.created_at,
  };
}

export async function resolveRecipient({ bankCode, accountNumber }) {
  const bank = await findBank(bankCode);
  if (!bank) throw new AppError(400, "Unsupported bank", "INVALID_BANK");
  try {
    const acct = await validateAccount({ accountNumber, bankCode });
    return {
      bankCode: bank.code,
      bankName: bank.name,
      accountNumber,
      accountName: acct.accountName,
    };
  } catch (err) {
    if (err instanceof MonnifyError) {
      throw new AppError(
        422,
        "Could not verify this account. Check the bank and account number.",
        "ACCOUNT_NOT_RESOLVED",
      );
    }
    throw err;
  }
}

export async function initiateTransaction(input) {
  if (hasMoreThan2dp(input.amount))
    throw new AppError(
      400,
      "Amount can have at most 2 decimal places",
      "INVALID_AMOUNT",
    );
  const netKobo = toKobo(input.amount);
  if (netKobo < feeConfig.minKobo || netKobo > feeConfig.maxKobo) {
    throw new AppError(
      400,
      `Amount must be between ₦${koboToNumber(feeConfig.minKobo).toLocaleString()} and ₦${koboToNumber(feeConfig.maxKobo).toLocaleString()}`,
      "AMOUNT_OUT_OF_RANGE",
    );
  }

  // Never trust the client's account name: re-resolve server-side
  const recipient = await resolveRecipient(input);

  const fees = computeFees(netKobo);
  const { reference, payoutReference } = newReferences();
  const expiresAt = new Date(Date.now() + feeConfig.expiryMinutes * 60 * 1000);

  const id = await repo.insertTransaction({
    reference,
    payoutReference,
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    purpose: input.purpose,
    bankCode: recipient.bankCode,
    bankName: recipient.bankName,
    accountNumber: recipient.accountNumber,
    accountName: recipient.accountName,
    net: fromKobo(fees.netKobo),
    bezpayFee: fromKobo(fees.bezpayFee),
    inflowFee: fromKobo(fees.gatewayInflowFee),
    payoutFee: fromKobo(fees.gatewayPayoutFee),
    total: fromKobo(fees.totalKobo),
    expiresAt,
  });

  try {
    const va = await createDynamicInvoiceAccount({
      reference,
      amount: koboToNumber(fees.totalKobo),
      description: `${input.purpose} via BezPay`,
      customerName: input.senderName,
      customerEmail: input.senderEmail,
      accountName: `${input.purpose} - BezPay`,
      expiresAt,
    });
    await repo.setVirtualAccount(id, va);
  } catch (err) {
    await repo.markFailed(id, err.message);
    console.error("[initiate] virtual account creation failed", {
      reference,
      err: err.message,
      code: err.monnifyCode,
    });
    throw new AppError(
      502,
      "Could not generate a payment account. Please try again.",
      "PROVIDER_ERROR",
    );
  }

  return toPublicDto(await repo.findByReference(reference));
}

export async function getTransactionStatus(reference) {
  let tx = await repo.findByReference(reference);
  if (!tx) throw new AppError(404, "Transaction not found", "NOT_FOUND");
  if (tx.status === "PENDING_INFLOW" && new Date(tx.expires_at) < new Date()) {
    await repo.expireIfStale(tx.id); // conditional update: never overwrites a paid state
    tx = await repo.findByReference(reference);
  }
  return toPublicDto(tx);
}
