const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
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

const files = walk('src');
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('import {') && content.includes('StaffRole') && content.includes('@/contexts/AuthContext')) {
    content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@\/contexts\/AuthContext['"]/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim()).filter(s => s);
      const authImports = imports.filter(i => !['StaffRole', 'STAFF_ROLES', 'ROLE_DESCRIPTIONS', 'ROLE_BADGE_CLASSES', 'normalizeRole'].includes(i));
      const roleImports = imports.filter(i => ['StaffRole', 'STAFF_ROLES', 'ROLE_DESCRIPTIONS', 'ROLE_BADGE_CLASSES', 'normalizeRole'].includes(i));
      
      let res = '';
      if (authImports.length > 0) {
        res += `import { ${authImports.join(', ')} } from '@/contexts/AuthContext';\n`;
      }
      if (roleImports.length > 0) {
        const renamed = roleImports.map(i => {
          if (i === 'StaffRole') return 'OrganizationRole';
          if (i === 'normalizeRole') return 'normalizeOrganizationRole';
          return i;
        });
        res += `import { ${renamed.join(', ')} } from '@/lib/auth/roles';`;
      }
      return res;
    });
    changed = true;
  }
  
  // also handle imports that don't include AuthContext but import from it
  if (content.includes('import {') && content.includes('ROLE_BADGE_CLASSES') && content.includes('@/contexts/AuthContext')) {
     content = content.replace(/import\s+{([^}]*)}\s+from\s+['"]@\/contexts\/AuthContext['"]/g, (match, p1) => {
      let imports = p1.split(',').map(s => s.trim()).filter(s => s);
      const authImports = imports.filter(i => !['StaffRole', 'STAFF_ROLES', 'ROLE_DESCRIPTIONS', 'ROLE_BADGE_CLASSES', 'normalizeRole'].includes(i));
      const roleImports = imports.filter(i => ['StaffRole', 'STAFF_ROLES', 'ROLE_DESCRIPTIONS', 'ROLE_BADGE_CLASSES', 'normalizeRole'].includes(i));
      
      let res = '';
      if (authImports.length > 0) {
        res += `import { ${authImports.join(', ')} } from '@/contexts/AuthContext';\n`;
      }
      if (roleImports.length > 0) {
        const renamed = roleImports.map(i => {
          if (i === 'StaffRole') return 'OrganizationRole';
          if (i === 'normalizeRole') return 'normalizeOrganizationRole';
          return i;
        });
        res += `import { ${renamed.join(', ')} } from '@/lib/auth/roles';`;
      }
      return res;
    });
    changed = true;
  }

  // Replace type usages
  if (content.includes('StaffRole')) {
    content = content.replace(/StaffRole/g, 'OrganizationRole');
    changed = true;
  }
  
  if (content.includes('normalizeRole')) {
    content = content.replace(/normalizeRole/g, 'normalizeOrganizationRole');
    changed = true;
  }
  
  if (content.includes('STAFF_ROLES')) {
    // we don't have STAFF_ROLES anymore, we use Object.values(OrganizationRole) but for now let's just let it fail or fix it manually
  }

  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
