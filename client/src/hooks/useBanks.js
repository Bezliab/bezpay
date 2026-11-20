import { useCallback, useEffect, useState } from 'react';
import { getBanks } from '../api/banks.api';

let cache = null;

export function useBanks() {
  const [banks, setBanks] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      cache = await getBanks();
      setBanks(cache);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!cache) load(); }, [load]);
  return { banks, loading, error, reload: load };
}
