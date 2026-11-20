import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Landmark, Search } from 'lucide-react';
import { inputCls } from '../ui/Field';

export default function BankSelect({ id, banks, value, onChange, loading, error, onRetry }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const selected = banks.find((b) => b.code === value);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? banks.filter((b) => b.name.toLowerCase().includes(s)) : banks;
  }, [banks, q]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
        <span>Couldn't load banks.</span>
        <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative" onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading}
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Landmark className="h-4 w-4 shrink-0 text-slate-400" />
          <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>
            {loading ? 'Loading banks…' : selected ? selected.name : 'Select bank'}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search banks"
              className="w-full rounded-lg bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">No banks found</li>}
            {filtered.map((b) => (
              <li key={b.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={b.code === value}
                  onClick={() => { onChange(b.code); setOpen(false); setQ(''); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 ${b.code === value ? 'font-semibold text-brand-700' : ''}`}
                >
                  {b.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
