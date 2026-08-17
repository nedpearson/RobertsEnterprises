const fs = require('fs');
const glob = require('glob'); // Not sure if glob is installed, but we can just use fs.readdirSync recursively
function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = dir + '/' + file;
    try {
      if (fs.statSync(dirFile).isDirectory()) {
        filelist = walkSync(dirFile, filelist);
      } else {
        if (dirFile.endsWith('.ts')) filelist.push(dirFile);
      }
    } catch(e) {}
  });
  return filelist;
}

const files = walkSync('apps/marketing/worker/src/modules/growth');
files.push('apps/marketing/src/lib/growth/growthService.ts');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content
    .replace(/\\\\/g, '')
    .replace(/\\\\\$/g, '$')
    .replace(/\\\\\\//g, '\\/');
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log('Fixed:', f);
  }
});
