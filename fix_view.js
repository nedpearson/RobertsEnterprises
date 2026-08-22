const fs = require("fs");
const p = "apps/marketing/src/pages/PlatformAdmin/IncidentsView.tsx";
let c = fs.readFileSync(p, "utf8");

if (!c.includes("useToast")) {
  c = c.replace(/import \{ Button \} from .@\/components\/ui\/button.;/, "import { Button } from \"@/components/ui/button\";\nimport { useToast } from \"@/components/ui/use-toast\";");
}

c = c.replace(/export default function IncidentsView\(\) \{/, "export default function IncidentsView() {\n  const { toast } = useToast();");

c = c.replace(/<Button variant="ghost" size="sm" className="text-xs mr-2">View<\/Button>/g, `<Button variant="ghost" size="sm" className="text-xs mr-2" onClick={() => toast({ title: "Incident Details", description: "Incident details view is under construction." })}>View</Button>`);

fs.writeFileSync(p, c, "utf8");
