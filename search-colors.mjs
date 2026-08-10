import fs from 'fs';
import path from 'path';

function searchDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'ui' && file !== 'node_modules' && file !== 'dist') {
        searchDirectory(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/(bg|text|border|ring|hover:bg|hover:text)-(rose|slate|zinc|gray|pink|purple|amber)-[0-9]+/g);
      if (matches) {
        console.log(`\nFile: ${fullPath}`);
        console.log(matches.join(', '));
      }
    }
  }
}

console.log("Searching apps/marketing/src:");
searchDirectory('apps/marketing/src');
console.log("\nSearching apps/vowos-marketing/src:");
searchDirectory('apps/vowos-marketing/src');
