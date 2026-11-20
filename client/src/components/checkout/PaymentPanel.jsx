import { AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import CopyField from './CopyField';
import CountdownTimer from './CountdownTimer';
import FeeBreakdown from './FeeBreakdown';
import { formatNaira } from '../../utils/format';

export default function PaymentPanel({ tx, onExpire }) {
  const va = tx.virtualAccount;
  return (
    <div className="space-y-4">
      <Card>
        <CountdownTimer expiresAt={tx.expiresAt} createdAt={tx.createdAt} onExpire={onExpire} />
      </Card>

      <Card className="space-y-3">
        <div>
          <p className="text-sm text-slate-500">{tx.purpose}</p>
          <h1 className="text-lg font-semibold">Transfer {formatNaira(tx.amounts.totalPayable)}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Send from any bank app or USSD to the account below. It works for this payment only.
          </p>
        </div>

        <CopyField label="Account number" value={va.accountNumber} large />
        <CopyField label="Bank" value={va.bankName} />
        <CopyField label="Account name" value={va.accountName} />
        <CopyField label="Exact amount" value={tx.amounts.totalPayable} display={formatNaira(tx.amounts.totalPayable)} />

        <div className="flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Send the exact amount. If less arrives, the recipient won't be paid and you'll need support to get a refund.</p>
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <p className="text-xs text-slate-500">Paying</p>
          <p className="text-sm font-semibold uppercase">{tx.recipient.accountName}</p>
          <p className="text-xs text-slate-500">{tx.recipient.bankName} · {tx.recipient.accountNumber}</p>
        </div>
        <FeeBreakdown amounts={tx.amounts} />
      </Card>

      <p className="flex items-center justify-center gap-2 text-sm text-slate-500" aria-live="polite">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
        </span>
        Waiting for your transfer. This page updates automatically.
      </p>
    </div>
  );
}
