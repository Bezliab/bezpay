import { Link, useParams } from 'react-router-dom';
import { Loader2, SearchX, WifiOff } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StepHeader from '../components/checkout/StepHeader';
import PaymentPanel from '../components/checkout/PaymentPanel';
import TrackerPanel from '../components/tracker/TrackerPanel';
import { useTransactionPolling } from '../hooks/useTransactionPolling';

export default function TransactionPage() {
  const { reference } = useParams();
  const { tx, loading, error, notFound, refresh } = useTransactionPolling(reference);

  if (loading && !tx) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <Card className="mt-6 space-y-3 text-center">
        <SearchX className="mx-auto h-8 w-8 text-slate-400" />
        <h1 className="text-lg font-semibold">Transaction not found</h1>
        <p className="text-sm text-slate-500">Check the link, or start a new payment.</p>
        <Link to="/" className="inline-block text-sm font-semibold text-brand-700 underline">Start a payment</Link>
      </Card>
    );
  }

  if (!tx) {
    return (
      <Card className="mt-6 space-y-3 text-center">
        <WifiOff className="mx-auto h-8 w-8 text-slate-400" />
        <p className="text-sm text-slate-600">{error || "We couldn't load this payment."}</p>
        <Button variant="secondary" onClick={refresh}>Try again</Button>
      </Card>
    );
  }

  const paying = tx.status === 'PENDING_INFLOW' && tx.virtualAccount;

  return (
    <>
      <StepHeader current={paying ? 2 : 3} />
      {error && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 print:hidden">
          <WifiOff className="h-3.5 w-3.5" /> Connection issue. Retrying automatically…
        </p>
      )}
      {paying ? <PaymentPanel tx={tx} onExpire={refresh} /> : <TrackerPanel tx={tx} />}
    </>
  );
}
