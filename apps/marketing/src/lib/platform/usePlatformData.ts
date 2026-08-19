import { useCallback, useEffect, useState } from 'react';
import { isPlatformDemoPlane, subscribePlatformPlane, PlatformResult } from './platformDataSource';

/** Re-runs `load` whenever the Platform demo plane is toggled. */
export function usePlatformData<T>(load: () => PlatformResult<T>): PlatformResult<T> {
  const run = useCallback(load, [load]);
  const [state, setState] = useState<PlatformResult<T>>(() => run());
  useEffect(() => {
    setState(run());
    return subscribePlatformPlane(() => setState(run()));
  }, [run]);
  return state;
}

export function usePlatformDemoPlane(): boolean {
  const [on, setOn] = useState(isPlatformDemoPlane());
  useEffect(() => subscribePlatformPlane(() => setOn(isPlatformDemoPlane())), []);
  return on;
}
