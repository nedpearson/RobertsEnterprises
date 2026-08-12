import fs from 'fs';

const content = fs.readFileSync('C:/dev/github/business/RobertsEnterprises/apps/marketing/public/marketing-assets/index-Cokxl-kX.js', 'utf8');

// Find all routes/links
const paths = content.match(/path:"[^"]+"/g) || [];
const links = content.match(/href:"[^"]+"/g) || [];

console.log('Routes in index-Cokxl-kX.js:', paths);
console.log('Links in index-Cokxl-kX.js:', links.slice(0, 20));
