const fs = require("fs");
const p = "apps/marketing/src/pages/PlatformAdmin/Delivery/Deployments.tsx";
let c = fs.readFileSync(p, "utf8");
c = c.replace(/variant="destructive" size="sm" variant="outline"/, `variant="outline" size="sm"`);
fs.writeFileSync(p, c, "utf8");

