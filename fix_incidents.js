const fs = require("fs");

const p0 = "apps/marketing/src/lib/platform/usePlatformData.ts";
let c0 = fs.readFileSync(p0, "utf8");
c0 = c0.replace(/PlatformResult<T> & \{ loading: boolean \} \{/, `PlatformResult<T> & { loading: boolean, refetch: () => void } {`);
c0 = c0.replace(/const unsubscribe = subscribePlatformPlane\(\(\) => fetch\(\)\);/, `const unsubscribe = subscribePlatformPlane(() => fetch());\n    return { fetch, unsubscribe };`);
// Wait, the return of useEffect is for cleanup. I can not return fetch there.
// Let us do it properly:
c0 = `import { useCallback, useEffect, useState } from "react";
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
`;
fs.writeFileSync(p0, c0, "utf8");

const p1 = "apps/marketing/src/lib/platform/platformDataSource.ts";
let c1 = fs.readFileSync(p1, "utf8");
c1 = c1.replace(/id: inc.id.substring\(0, 8\).toUpperCase\(\),/, `full_id: inc.id,\n    id: inc.id.substring(0, 8).toUpperCase(),`);
fs.writeFileSync(p1, c1, "utf8");

const p2 = "apps/marketing/src/pages/PlatformAdmin/IncidentsView.tsx";
let c2 = fs.readFileSync(p2, "utf8");
c2 = c2.replace(/\{new Date\(inc\.started\)\.toLocaleString\(\)\}/g, "{inc.started}");

c2 = c2.replace(
  /<TableCell className="text-right">\s*<Button variant="ghost" size="sm" className="text-xs">\s*View\s*<\/Button>\s*<\/TableCell>/g,
  `<TableCell className="text-right">\n  <Button variant="ghost" size="sm" className="text-xs mr-2">View</Button>\n  {inc.status !== "RESOLVED" && (\n    <Button onClick={() => handleResolve((inc as any).full_id)} variant="outline" size="sm" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700">Resolve</Button>\n  )}\n</TableCell>`
);

c2 = c2.replace(
  /export default function IncidentsView\(\) \{\n  const \{ data: incidents, error \} = usePlatformData\(useCallback\(\(\) => getIncidents\(\), \[\]\)\);/,
  `import { supabase } from "@/lib/supabase";\nexport default function IncidentsView() {\n  const { data: incidents, error, refetch } = usePlatformData(useCallback(() => getIncidents(), []));\n\n  const handleResolve = async (id: string) => {\n    if (!id) return;\n    await supabase.from("platform_incidents").update({ status: "RESOLVED" }).eq("id", id);\n    refetch();\n  };`
);
fs.writeFileSync(p2, c2, "utf8");
