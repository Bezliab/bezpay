import { useCallback, useEffect, useRef, useState } from 'react';
import { getTransaction } from '../api/transactions.api';
import { TERMINAL } from '../utils/status';

const MAX_EXPIRED_POLLS = 20; // ~100s of grace for a last-second payment

export function useTransactionPolling(reference) {
  const [state, setState] = useState({ tx: null, loading: true, error: null, notFound: false });
  const timer = useRef(null);
  const alive = useRef(true);
  const failures = useRef(0);
  const expiredPolls = useRef(0);

  // resolves true when polling should stop
  const fetchOnce = useCallback(async () => {
    try {
      const tx = await getTransaction(reference);
      if (!alive.current) return true;
      failures.current = 0;
      setState({ tx, loading: false, error: null, notFound: false });
      if (tx.status === 'EXPIRED') return ++expiredPolls.current > MAX_EXPIRED_POLLS;
      return TERMINAL.includes(tx.status);
    } catch (e) {
      if (!alive.current) return true;
      if (e.status === 404) {
        setState((s) => ({ ...s, loading: false, notFound: true }));
        return true;
      }
      failures.current += 1;
      setState((s) => ({ ...s, loading: false, error: e.message }));
      return false;
    }
  }, [reference]);

  const run = useCallback(async () => {
    const stop = await fetchOnce();
    if (!alive.current || stop) return;
    const delay = Math.min(3000 * 2 ** Math.min(failures.current, 3), 15000); // backoff on errors
    timer.current = setTimeout(run, delay);
  }, [fetchOnce]);

  useEffect(() => {
    alive.current = true;
    expiredPolls.current = 0;
    run();
    return () => { alive.current = false; clearTimeout(timer.current); };
  }, [run]);

  const refresh = useCallback(() => { clearTimeout(timer.current); run(); }, [run]);
  return { ...state, refresh };
}
