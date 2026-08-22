const fs = require("fs");
const p = ".github/workflows/certify.yml";
let c = fs.readFileSync(p, "utf8");
c = c.replace(/version: latest/g, "version: v2.75.0");
fs.writeFileSync(p, c, "utf8");
