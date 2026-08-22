const fs = require("fs");
const p2 = "apps/marketing/src/pages/PlatformAdmin/IncidentsView.tsx";
let c2 = fs.readFileSync(p2, "utf8");
c2 = c2.replace(/export default function IncidentsView\(\) \{\r?\n\s+const \{ data: incidents, error \} = usePlatformData\(useCallback\(\(\) => getIncidents\(\), \[\]\)\);/, `import { supabase } from "@/lib/supabase";\nexport default function IncidentsView() {\n  const { data: incidents, error, refetch } = usePlatformData(useCallback(() => getIncidents(), []));\n\n  const handleResolve = async (id: string) => {\n    if (!id) return;\n    await supabase.from("platform_incidents").update({ status: "RESOLVED" }).eq("id", id);\n    refetch();\n  };`);
fs.writeFileSync(p2, c2, "utf8");
