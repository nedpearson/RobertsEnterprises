const fs = require("fs");
const p = "apps/marketing/src/pages/PlatformAdmin.tsx";
let c = fs.readFileSync(p, "utf8");

c = c.replace(/<Route path="\/audit" element=\{<PlatformAuditView \/>\} \/>/, `<Route path="/audit" element={<PlatformAuditView />} />\n            <Route path="/delivery/*" element={<DeliveryCenter />} />`);

fs.writeFileSync(p, c, "utf8");
