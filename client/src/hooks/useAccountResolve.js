import { useEffect, useState } from 'react';
import { resolveAccount } from '../api/banks.api';

export function useAccountResolve(bankCode, accountNumber) {
  const [state, setState] = useState({ status: 'idle', account: null, error: null });

  useEffect(() => {
    if (!bankCode || accountNumber.length !== 10) {
      setState({ status: 'idle', account: null, error: null });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading', account: null, error: null });
    const t = setTimeout(async () => {
      try {
        const account = await resolveAccount({ bankCode, accountNumber });
        if (!cancelled) setState({ status: 'success', account, error: null });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', account: null, error: e.message });
      }
    }, 300); // debounce
    return () => { cancelled = true; clearTimeout(t); };
  }, [bankCode, accountNumber]);

  return state;
}
