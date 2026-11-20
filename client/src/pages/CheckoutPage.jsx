import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Lock } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Field, { inputCls } from '../components/ui/Field';
import StepHeader from '../components/checkout/StepHeader';
import BankSelect from '../components/checkout/BankSelect';
import AccountResolver from '../components/checkout/AccountResolver';
import { useBanks } from '../hooks/useBanks';
import { useAccountResolve } from '../hooks/useAccountResolve';
import { initiateTransaction } from '../api/transactions.api';
import { onlyDigits } from '../utils/format';

const PURPOSE_RE = /^[A-Za-z0-9 &.,'/()-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUGGESTIONS = ['School Fees', 'House Rent', 'Vendor Payment'];

// digits + one dot + max 2 decimals
const sanitizeAmount = (v) => {
  const [whole = '', ...rest] = v.replace(/[^\d.]/g, '').split('.');
  return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { banks, loading, error: banksError, reload } = useBanks();
  const [form, setForm] = useState({ bankCode: '', accountNumber: '', amount: '', purpose: '', senderName: '', senderEmail: '' });
  const [touched, setTouched] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const resolve = useAccountResolve(form.bankCode, form.accountNumber);

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSubmitError(null);
    if (key === 'bankCode' || key === 'accountNumber') setConfirmed(false);
  };
  const blur = (key) => setTouched((t) => ({ ...t, [key]: true }));

  const amountNum = Number(form.amount);
  const purpose = form.purpose.trim();
  const errors = {
    amount: !form.amount ? 'Enter an amount' : !(amountNum > 0) ? 'Enter a valid amount' : null,
    purpose:
      purpose.length < 3 ? 'At least 3 characters'
      : purpose.length > 40 ? 'Maximum 40 characters'
      : !PURPOSE_RE.test(purpose) ? 'Letters, numbers and basic punctuation only'
      : null,
    senderName: form.senderName.trim().length < 2 ? 'Enter your name' : null,
    senderEmail: !EMAIL_RE.test(form.senderEmail.trim()) ? 'Enter a valid email address' : null,
  };
  const show = (k) => (touched[k] ? errors[k] : null);
  const valid = resolve.status === 'success' && confirmed && !Object.values(errors).some(Boolean);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const tx = await initiateTransaction({
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        amount: amountNum,
        purpose,
        senderName: form.senderName.trim(),
        senderEmail: form.senderEmail.trim(),
      });
      navigate(`/t/${tx.reference}`);
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <>
      <StepHeader current={1} />
      <form onSubmit={onSubmit} noValidate>
        <Card className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Send a payment</h1>
            <p className="mt-1 text-sm text-slate-500">
              Pay anyone in Nigeria. You transfer to a one-time account and we deliver it to the recipient automatically.
            </p>
          </div>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Recipient</legend>
            <Field label="Bank" htmlFor="bank">
              <BankSelect id="bank" banks={banks} value={form.bankCode} onChange={(v) => set('bankCode', v)}
                loading={loading} error={banksError} onRetry={reload} />
            </Field>
            <Field label="Account number" htmlFor="account" hint="10-digit NUBAN">
              <input id="account" inputMode="numeric" autoComplete="off" placeholder="0123456789"
                className={`${inputCls} font-mono tracking-wider`} value={form.accountNumber}
                onChange={(e) => set('accountNumber', onlyDigits(e.target.value).slice(0, 10))} />
            </Field>
            <AccountResolver state={resolve} />
            {resolve.status === 'success' && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                I confirm this is the correct recipient
              </label>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Payment</legend>
            <Field label="Amount" htmlFor="amount" error={show('amount')}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₦</span>
                <input id="amount" inputMode="decimal" placeholder="0.00" className={`${inputCls} pl-8`}
                  value={form.amount} onBlur={() => blur('amount')}
                  onChange={(e) => set('amount', sanitizeAmount(e.target.value))} />
              </div>
            </Field>
            <Field label="Purpose" htmlFor="purpose" error={show('purpose')}
              hint="Shown on the payment account name, e.g. “School Fees - BezPay”">
              <input id="purpose" maxLength={40} placeholder="School Fees" className={inputCls}
                value={form.purpose} onBlur={() => blur('purpose')} onChange={(e) => set('purpose', e.target.value)} />
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => { set('purpose', s); blur('purpose'); }}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Your details</legend>
            <Field label="Full name" htmlFor="name" error={show('senderName')}>
              <input id="name" autoComplete="name" className={inputCls} value={form.senderName}
                onBlur={() => blur('senderName')} onChange={(e) => set('senderName', e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="email" error={show('senderEmail')} hint="For your receipt and tracking link">
              <input id="email" type="email" autoComplete="email" className={inputCls} value={form.senderEmail}
                onBlur={() => blur('senderEmail')} onChange={(e) => set('senderEmail', e.target.value)} />
            </Field>
          </fieldset>

          {submitError && (
            <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
            </p>
          )}

          <div className="space-y-3">
            <Button type="submit" className="w-full" disabled={!valid} loading={submitting}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" /> You'll see the exact total, including fees, before you pay.
            </p>
          </div>
        </Card>
      </form>
    </>
  );
}
