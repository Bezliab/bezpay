import Card from '../ui/Card';
import ProgressStepper from './ProgressStepper';
import StatusBanner from './StatusBanner';
import Receipt from './Receipt';
import { formatNaira } from '../../utils/format';

const headline = (tx) => {
  switch (tx.status) {
    case 'COMPLETED': return 'Payment delivered';
    case 'INFLOW_CONFIRMED':
    case 'PAYOUT_PROCESSING': return `Sending ${formatNaira(tx.amounts.net)}`;
    case 'EXPIRED': return 'Payment expired';
    case 'UNDERPAID': return 'Payment incomplete';
    default: return 'Payment unsuccessful';
  }
};

export default function TrackerPanel({ tx }) {
  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">{headline(tx)}</h1>
          <p className="mt-0.5 break-all font-mono text-xs text-slate-400">{tx.reference}</p>
        </div>
        <ProgressStepper tx={tx} />
      </Card>

      <div className="print:hidden"><StatusBanner tx={tx} /></div>
      {tx.status === 'COMPLETED' && <Receipt tx={tx} />}
    </div>
  );
}
