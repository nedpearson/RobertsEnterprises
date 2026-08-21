import { useCallback, useEffect, useState } from 'react';
import { isPlatformDemoPlane, subscribePlatformPlane, PlatformResult } from './platformDataSource';

/** Re-runs `load` whenever the Platform demo plane is toggled. */
export function usePlatformData<T>(load: () => Promise<PlatformResult<T>>): PlatformResult<T> & { loading: boolean } {
  const run = useCallback(load, [load]);
  const [state, setState] = useState<PlatformResult<T>>({ data: [] as any, demo: false, error: null });
  const [loading, setLoading] = useState(true);

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
    return subscribePlatformPlane(() => fetch());
  }, [run]);

  return { ...state, loading };
}

export function usePlatformDemoPlane(): boolean {
  const [on, setOn] = useState(isPlatformDemoPlane());
  useEffect(() => subscribePlatformPlane(() => setOn(isPlatformDemoPlane())), []);
  return on;

}

