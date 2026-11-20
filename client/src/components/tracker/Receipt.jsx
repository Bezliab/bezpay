import { useState } from 'react';
import { CheckCircle2, Printer, Share2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatDateTime, formatNaira } from '../../utils/format';

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-4 py-2 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className={`text-right font-medium ${mono ? 'break-all font-mono text-xs' : ''}`}>{value}</dd>
  </div>
);

export default function Receipt({ tx }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `BezPay receipt ${tx.reference}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <Card id="receipt" className="space-y-5">
      <div className="text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 className="h-6 w-6 text-brand-600" />
        </span>
        <p className="text-sm text-slate-500">Payment delivered</p>
        <p className="text-3xl font-bold tracking-tight">{formatNaira(tx.amounts.net)}</p>
        <p className="mt-1 text-sm text-slate-500">{tx.purpose}</p>
      </div>

      <dl className="divide-y divide-slate-100 border-y border-slate-100">
        <Row label="Reference" value={tx.reference} mono />
        <Row label="Date" value={formatDateTime(tx.completedAt)} />
        <Row label="Sender" value={tx.senderName} />
        <Row label="Recipient" value={<span className="uppercase">{tx.recipient.accountName}</span>} />
        <Row label="Bank" value={tx.recipient.bankName} />
        <Row label="Account" value={tx.recipient.accountNumber} />
      </dl>

      <dl className="divide-y divide-slate-100">
        <Row label="Amount sent" value={formatNaira(tx.amounts.net)} />
        <Row label="BezPay service fee" value={formatNaira(tx.amounts.bezpayFee)} />
        <Row label="Bank & processing fees" value={formatNaira(tx.amounts.gatewayFees)} />
        <Row label="Total paid" value={<span className="font-semibold">{formatNaira(tx.amounts.totalPayable)}</span>} />
      </dl>

      <p className="text-center text-xs text-slate-400">Processed by BezPay</p>

      <div className="flex gap-2 print:hidden">
        <Button variant="secondary" className="flex-1" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
        <Button variant="secondary" className="flex-1" onClick={share}>
          <Share2 className="h-4 w-4" /> {copied ? 'Link copied' : 'Share link'}
        </Button>
      </div>
    </Card>
  );
}
