import { useCallback, useEffect, useState } from "react";
import { isPlatformDemoPlane, subscribePlatformPlane, PlatformResult } from "./platformDataSource";

export function usePlatformData<T>(load: () => Promise<PlatformResult<T>>): PlatformResult<T> & { loading: boolean, refetch: () => void } {
  const run = useCallback(load, [load]);
  const [state, setState] = useState<PlatformResult<T>>({ data: [] as any, demo: false, error: null });
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  const refetch = useCallback(() => setTrigger(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      const res = await run();
      if (!cancelled) {
        setState(res);
        setLoading(false);
      }
    };
    fetch();
    const unsubscribe = subscribePlatformPlane(() => fetch());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [run, trigger]);

  return { ...state, loading, refetch };
}

export function usePlatformDemoPlane(): boolean {
  const [on, setOn] = useState(isPlatformDemoPlane());
  useEffect(() => subscribePlatformPlane(() => setOn(isPlatformDemoPlane())), []);
  return on;
}
