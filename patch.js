const fs = require("fs");
const p = "apps/marketing/src/pages/PlatformAdmin.tsx";
let c = fs.readFileSync(p, "utf8");

if (!c.includes("DeliveryCenter")) {
  c = c.replace(/import \{ HeartHandshake, HeadphonesIcon \} from .lucide-react.;/, `import { HeartHandshake, HeadphonesIcon, HardDrive } from "lucide-react";\nimport DeliveryCenter from "./PlatformAdmin/Delivery/DeliveryCenter";`);
  
  c = c.replace(/\{ name: .Release Dashboard./, `{ name: "Delivery & Recovery", path: "/platform/delivery", icon: <HardDrive className="w-4 h-4" /> },\n        { name: "Release Dashboard"`);
  
  fs.writeFileSync(p, c, "utf8");
}
