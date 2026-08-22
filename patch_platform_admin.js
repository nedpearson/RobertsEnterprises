const fs = require("fs");
const path = require("path");
const p = path.join(__dirname, "apps/marketing/src/pages/PlatformAdmin.tsx");
let content = fs.readFileSync(p, "utf8");

content = content.replace("import { HeartHandshake, HeadphonesIcon } from \"lucide-react\";", "import { HeartHandshake, HeadphonesIcon, HardDrive } from \"lucide-react\";\nimport DeliveryCenter from \"./PlatformAdmin/Delivery/DeliveryCenter\";");

content = content.replace("{ name: \"Release Dashboard\"", "{ name: \"Delivery & Recovery\", path: \"/platform/delivery\", icon: <HardDrive className=\"w-4 h-4\" /> },\n        { name: \"Release Dashboard\"");

content = content.replace("<Route path=\"/audit\" element={<PlatformAuditView />} />", "<Route path=\"/audit\" element={<PlatformAuditView />} />\n            <Route path=\"/delivery/*\" element={<DeliveryCenter />} />");

fs.writeFileSync(p, content, "utf8");
