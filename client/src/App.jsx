import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import CheckoutPage from './pages/CheckoutPage';
import TransactionPage from './pages/TransactionPage';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="print:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-5">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck className="h-4 w-4" />
            </span>
            BezPay
          </Link>
          <span className="text-xs text-slate-500">Secure pass-through payments</span>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pb-16">
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          <Route path="/t/:reference" element={<TransactionPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
