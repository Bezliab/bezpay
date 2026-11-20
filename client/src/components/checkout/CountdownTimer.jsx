import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

const fmt = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function CountdownTimer({ expiresAt, createdAt, onExpire }) {
  const end = new Date(expiresAt).getTime();
  const total = Math.max(end - new Date(createdAt).getTime(), 1);
  const [left, setLeft] = useState(() => end - Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const l = end - Date.now();
      setLeft(l);
      if (l <= 0 && !fired.current) {
        fired.current = true;
        onExpire?.(); // triggers an immediate status refresh
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end, onExpire]);

  const pct = Math.min(100, Math.max(0, (left / total) * 100));
  const critical = left < 60_000;
  const urgent = left < 5 * 60_000;
  const tone = critical ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-slate-900';
  const bar = critical ? 'bg-red-500' : urgent ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div role="timer" aria-live="off">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-slate-500"><Clock className="h-4 w-4" /> Account expires in</span>
        <span className={`font-mono text-lg font-semibold tabular-nums ${tone}`}>{fmt(left)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
