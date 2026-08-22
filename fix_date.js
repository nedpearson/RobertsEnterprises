const fs = require("fs");
const p = "apps/marketing/src/lib/platform/platformDataSource.ts";
let c = fs.readFileSync(p, "utf8");

// replace: started: new Date(inc.created_at).toLocaleString(),
// with a safer parsing: 
// const dateStr = inc.created_at ? inc.created_at.replace(" ", "T") : new Date().toISOString();
// started: new Date(dateStr).toLocaleString(),

c = c.replace(/started: new Date\(inc\.created_at\)\.toLocaleString\(\),/, `started: new Date(inc.created_at ? inc.created_at.replace(" ", "T") : new Date().toISOString()).toLocaleString(),`);
fs.writeFileSync(p, c, "utf8");

