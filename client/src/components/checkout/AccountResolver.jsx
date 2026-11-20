import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AccountResolver({ state }) {
  if (state.status === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Verifying account…
      </p>
    );
  }
  if (state.status === 'success') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div>
          <p className="text-xs text-brand-700">Account name</p>
          <p className="text-sm font-semibold uppercase tracking-wide">{state.account.accountName}</p>
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <p className="flex items-start gap-2 text-sm text-red-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
      </p>
    );
  }
  return null;
}
