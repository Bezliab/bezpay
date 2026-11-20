import { Check, Loader2, X } from 'lucide-react';
import { FLOW, STEPS } from '../../utils/status';
import { formatDateTime } from '../../utils/format';

export default function ProgressStepper({ tx }) {
  const idx = FLOW.indexOf(tx.status);
  // Off-path states: where did it break?
  const failedAt = idx !== -1 ? -1 : tx.status === 'FAILED' && tx.paidAt ? 2 : 0;
  const stamps = [tx.createdAt, tx.paidAt, null, tx.completedAt];

  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const state =
          tx.status === 'COMPLETED' ? 'done'
          : failedAt >= 0 ? (i < failedAt ? 'done' : i === failedAt ? 'failed' : 'todo')
          : i < idx ? 'done' : i === idx ? 'active' : 'todo';

        const circle = {
          done: 'bg-brand-600 text-white',
          active: 'bg-slate-900 text-white',
          failed: 'bg-red-600 text-white',
          todo: 'bg-slate-100 text-slate-400',
        }[state];

        return (
          <li key={s.title} className="relative flex gap-3 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px ${state === 'done' ? 'bg-brand-200' : 'bg-slate-200'}`} />
            )}
            <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${circle}`}>
              {state === 'done' && <Check className="h-4 w-4" />}
              {state === 'active' && <Loader2 className="h-4 w-4 animate-spin" />}
              {state === 'failed' && <X className="h-4 w-4" />}
              {state === 'todo' && <span className="text-xs font-semibold">{i + 1}</span>}
            </span>
            <div className="pt-0.5">
              <p className={`text-sm font-medium ${state === 'todo' ? 'text-slate-400' : 'text-slate-900'}`}>
                {state === 'done' ? s.done : s.title}
              </p>
              {state === 'done' && stamps[i] && <p className="text-xs text-slate-500">{formatDateTime(stamps[i])}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
