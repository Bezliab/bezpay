import { Check } from 'lucide-react';

const STEPS = ['Details', 'Pay', 'Track'];

export default function StepHeader({ current }) {
  return (
    <ol className="mb-6 flex items-center justify-center gap-2 text-xs font-medium print:hidden">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                done ? 'bg-brand-600 text-white' : active ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </span>
            <span className={active ? 'text-slate-900' : 'text-slate-400'}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-slate-200" />}
          </li>
        );
      })}
    </ol>
  );
}
