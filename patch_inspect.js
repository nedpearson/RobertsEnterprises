const fs = require("fs");
const p = "apps/marketing/src/pages/PlatformAdmin/IntegrationsHealthView.tsx";
let c = fs.readFileSync(p, "utf8");

if (!c.includes("useToast")) {
  c = c.replace(/import \{ Button \} from .@\/components\/ui\/button.;/, "import { Button } from \"@/components/ui/button\";\nimport { useToast } from \"@/components/ui/use-toast\";");
}
c = c.replace(/export default function IntegrationsHealthView\(\) \{/, "export default function IntegrationsHealthView() {\n  const { toast } = useToast();");
c = c.replace(/<Button variant="ghost" size="sm" className="text-xs">/g, `<Button variant="ghost" size="sm" className="text-xs" onClick={() => toast({ title: "Integration Details", description: "Integration inspect view is under construction." })}>`);

fs.writeFileSync(p, c, "utf8");
