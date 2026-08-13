const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./apps/marketing/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/Math\.floor\(Math\.random\(\)\s*\*\s*40\)\s*\+\s*50/g, '0');
  content = content.replace(/`\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.slice\(2\)\}`/g, 'crypto.randomUUID()');
  content = content.replace(/Math\.random\(\)\.toString\(36\)\.substring\(2,\s*9\)/g, 'crypto.randomUUID().substring(0, 7)');
  content = content.replace(/Math\.random\(\)\.toString\(36\)\.substring\(2,\s*8\)\.toUpperCase\(\)/g, 'crypto.randomUUID().substring(0, 6).toUpperCase()');
  content = content.replace(/Math\.floor\(Math\.random\(\)\s*\*\s*900000\s*\+\s*100000\)/g, '100000');
  content = content.replace(/Math\.floor\(100000\s*\+\s*Math\.random\(\)\s*\*\s*900000\)/g, '100000');
  content = content.replace(/Math\.floor\(Math\.random\(\)\s*\*\s*1000\)/g, '0');
  content = content.replace(/Math\.random\(\)\s*\*\s*40\s*-\s*20/g, '0');
  content = content.replace(/Math\.random\(\)\s*\*\s*4/g, '0');
  content = content.replace(/\+\s*\(Math\.random\(\)\s*-\s*0\.5\)\s*\*\s*0\.001/g, '');
  content = content.replace(/Math\.random\(\)/g, '0.5');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
});
