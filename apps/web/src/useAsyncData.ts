import { useState, useEffect, useCallback } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Hook for loading async data with loading/error/retry states.
 * `loader` should be a stable reference (module-level function or useCallback).
 * Pass `deps` to re-run when parameters change.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, retryCount]);

  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  return { data, loading, error, retry };
}
