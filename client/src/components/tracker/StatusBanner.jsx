import { Link } from 'react-router-dom';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { formatNaira } from '../../utils/format';

const SUPPORT = import.meta.env.VITE_SUPPORT_EMAIL || 'support@bezpay.app';

const tones = {
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  red: 'bg-red-50 text-red-900 border-red-200',
  slate: 'bg-slate-50 text-slate-800 border-slate-200',
};

export default function StatusBanner({ tx }) {
  const paid = Boolean(tx.amounts.amountPaid);
  let cfg = null;

  if (tx.status === 'EXPIRED') {
    cfg = {
      tone: 'amber', Icon: Clock, newPayment: true,
      title: 'This payment window has closed',
      body: 'No money was taken. If you already sent the transfer, it is safe and this page will update automatically. Otherwise, start a new payment.',
    };
  } else if (tx.status === 'UNDERPAID') {
    cfg = {
      tone: 'red', Icon: AlertCircle, support: true,
      title: 'The amount received was too low',
      body: `We received ${formatNaira(tx.amounts.amountPaid)} but ${formatNaira(tx.amounts.totalPayable)} was required. The recipient has not been paid. Contact support with your reference to arrange a refund.`,
    };
  } else if (tx.status === 'FAILED' && paid) {
    cfg = {
      tone: 'red', Icon: AlertCircle, support: true,
      title: "We couldn't deliver your payment",
      body: 'Your transfer was received, but the recipient has not been paid. Contact support with your reference and we will resolve it.',
    };
  } else if (tx.status === 'FAILED') {
    cfg = {
      tone: 'red', Icon: AlertCircle, newPayment: true,
      title: "Payment account couldn't be created",
      body: 'No money was taken. Please start a new payment.',
    };
  } else if (['INFLOW_CONFIRMED', 'PAYOUT_PROCESSING'].includes(tx.status)) {
    cfg = {
      tone: 'slate', Icon: Loader2, spin: true,
      title: `Paying ${tx.recipient.accountName}`,
      body: 'Your payment is confirmed and on its way. This can take a few minutes. You can keep this page open or come back to this link.',
    };
  }

  if (!cfg) return null;
  const { Icon } = cfg;

  return (
    <div className={`rounded-2xl border p-4 ${tones[cfg.tone]}`} role="status" aria-live="polite">
      <div className="flex gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${cfg.spin ? 'animate-spin' : ''}`} />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">{cfg.title}</p>
          <p className="opacity-90">{cfg.body}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 font-semibold">
            {cfg.newPayment && <Link to="/" className="underline">Start a new payment</Link>}
            {cfg.support && (
              <a className="underline" href={`mailto:${SUPPORT}?subject=BezPay%20${tx.reference}`}>Email support</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
