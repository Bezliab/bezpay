import { formatNaira } from '../../utils/format';

const Row = ({ label, value, strong }) => (
  <div className={`flex items-center justify-between ${strong ? 'text-base font-semibold' : 'text-slate-600'}`}>
    <dt>{label}</dt>
    <dd className={strong ? '' : 'font-medium text-slate-900'}>{value}</dd>
  </div>
);

export default function FeeBreakdown({ amounts }) {
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Recipient receives" value={formatNaira(amounts.net)} />
      <Row label="BezPay service fee" value={formatNaira(amounts.bezpayFee)} />
      <Row label="Bank & processing fees" value={formatNaira(amounts.gatewayFees)} />
      <div className="border-t border-dashed border-slate-200 pt-2">
        <Row label="Total to pay" value={formatNaira(amounts.totalPayable)} strong />
      </div>
    </dl>
  );
}
