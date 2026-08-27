const fs = require('fs');
let text = fs.readFileSync('globo_data.js', 'utf8');
const match = text.match(/after_submit_script":"([^"]*)"/);
const match2 = text.match(/script":"([^"]*)"/);
console.log(match ? match[1] : match2 ? match2[1] : 'none');
