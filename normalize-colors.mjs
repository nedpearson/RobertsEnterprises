import fs from 'fs';
import path from 'path';

const replacements = [
  { regex: /bg-rose-500/g, replacement: "bg-brand-primary" },
  { regex: /hover:bg-rose-600/g, replacement: "hover:bg-brand-primary-hover" },
  { regex: /hover:bg-rose-500/g, replacement: "hover:bg-brand-primary" },
  { regex: /bg-rose-600/g, replacement: "bg-brand-primary-hover" },
  { regex: /bg-rose-400/g, replacement: "bg-brand-primary" },
  
  { regex: /text-rose-600/g, replacement: "text-brand-primary" },
  { regex: /text-rose-500/g, replacement: "text-brand-primary" },
  { regex: /text-rose-700/g, replacement: "text-brand-primary-hover" },
  { regex: /hover:text-rose-600/g, replacement: "hover:text-brand-primary-hover" },
  { regex: /hover:text-rose-700/g, replacement: "hover:text-brand-primary-hover" },
  { regex: /text-rose-400/g, replacement: "text-brand-primary" },
  
  { regex: /border-rose-500/g, replacement: "border-brand-primary" },
  { regex: /border-rose-400/g, replacement: "border-brand-primary" },
  { regex: /border-rose-600/g, replacement: "border-brand-primary-hover" },
  
  { regex: /ring-rose-500/g, replacement: "ring-focus-ring" },
  { regex: /ring-rose-400/g, replacement: "ring-focus-ring" },
  
  { regex: /bg-rose-50/g, replacement: "bg-brand-soft" },
  { regex: /bg-rose-100/g, replacement: "bg-brand-soft" },
  { regex: /hover:bg-rose-50/g, replacement: "hover:bg-brand-soft" },
  { regex: /hover:bg-rose-100/g, replacement: "hover:bg-brand-soft" },
  { regex: /text-rose-900/g, replacement: "text-brand-secondary" },
  { regex: /text-rose-950/g, replacement: "text-brand-secondary" },
  { regex: /text-rose-800/g, replacement: "text-brand-secondary" },
  { regex: /border-rose-200/g, replacement: "border-border-subtle" },
  { regex: /border-rose-100/g, replacement: "border-border-subtle" },
  { regex: /ring-rose-200/g, replacement: "ring-focus-ring" },
  { regex: /ring-rose-100/g, replacement: "ring-focus-ring" },

  { regex: /text-slate-900/g, replacement: "text-text-primary" },
  { regex: /text-slate-800/g, replacement: "text-text-primary" },
  { regex: /text-slate-700/g, replacement: "text-text-primary" },
  { regex: /text-slate-600/g, replacement: "text-text-secondary" },
  { regex: /text-slate-500/g, replacement: "text-text-muted" },
  { regex: /text-slate-400/g, replacement: "text-text-muted" },
  
  { regex: /text-gray-900/g, replacement: "text-text-primary" },
  { regex: /text-gray-800/g, replacement: "text-text-primary" },
  { regex: /text-gray-700/g, replacement: "text-text-primary" },
  { regex: /text-gray-600/g, replacement: "text-text-secondary" },
  { regex: /text-gray-500/g, replacement: "text-text-muted" },
  { regex: /text-gray-400/g, replacement: "text-text-muted" },
  
  { regex: /text-zinc-900/g, replacement: "text-text-primary" },
  { regex: /text-zinc-800/g, replacement: "text-text-primary" },
  { regex: /text-zinc-700/g, replacement: "text-text-primary" },
  { regex: /text-zinc-600/g, replacement: "text-text-secondary" },
  { regex: /text-zinc-500/g, replacement: "text-text-muted" },
  { regex: /text-zinc-400/g, replacement: "text-text-muted" },

  { regex: /bg-slate-900/g, replacement: "bg-surface-dark" },
  { regex: /bg-slate-800/g, replacement: "bg-surface-dark" },
  { regex: /bg-slate-50/g, replacement: "bg-surface-canvas" },
  { regex: /bg-slate-100/g, replacement: "bg-surface-elevated" },
  { regex: /hover:bg-slate-100/g, replacement: "hover:bg-surface-elevated" },
  { regex: /hover:bg-slate-50/g, replacement: "hover:bg-surface-elevated" },
  
  { regex: /border-slate-200/g, replacement: "border-border-default" },
  { regex: /border-slate-300/g, replacement: "border-border-strong" },
  { regex: /border-gray-200/g, replacement: "border-border-default" },
  { regex: /border-gray-300/g, replacement: "border-border-strong" },
  { regex: /border-zinc-200/g, replacement: "border-border-default" },
  { regex: /border-zinc-300/g, replacement: "border-border-strong" },
  
  { regex: /ring-slate-200/g, replacement: "ring-border-default" },
  { regex: /ring-gray-200/g, replacement: "ring-border-default" },
  { regex: /ring-zinc-200/g, replacement: "ring-border-default" },
  
  { regex: /bg-amber-500/g, replacement: "bg-status-warning" }, 
  { regex: /text-amber-500/g, replacement: "text-status-warning" },
  { regex: /text-amber-600/g, replacement: "text-status-warning" },
  { regex: /text-amber-700/g, replacement: "text-status-warning" },
  { regex: /bg-amber-50/g, replacement: "bg-status-warning/10" },
  { regex: /border-amber-200/g, replacement: "border-status-warning/20" },
  { regex: /ring-amber-500/g, replacement: "ring-status-warning" },
  
  { regex: /bg-blue-500/g, replacement: "bg-status-info" },
  { regex: /text-blue-500/g, replacement: "text-status-info" },
  { regex: /text-blue-600/g, replacement: "text-status-info" },
  { regex: /bg-blue-50/g, replacement: "bg-status-info/10" },
  
  { regex: /bg-green-500/g, replacement: "bg-status-success" },
  { regex: /bg-emerald-500/g, replacement: "bg-status-success" },
  { regex: /text-green-500/g, replacement: "text-status-success" },
  { regex: /text-green-600/g, replacement: "text-status-success" },
  { regex: /text-emerald-500/g, replacement: "text-status-success" },
  { regex: /text-emerald-600/g, replacement: "text-status-success" },
  { regex: /bg-green-50/g, replacement: "bg-status-success/10" },
  { regex: /bg-emerald-50/g, replacement: "bg-status-success/10" },

  { regex: /bg-purple-500/g, replacement: "bg-vowos-violet" },
  { regex: /text-purple-500/g, replacement: "text-vowos-violet" },
  { regex: /text-purple-600/g, replacement: "text-vowos-violet" },
  { regex: /bg-purple-50/g, replacement: "bg-vowos-violet/10" },
];

function normalizeDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'ui' && file !== 'node_modules' && file !== 'dist') {
        normalizeDirectory(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Also update imports from @/components/ui to @vowos/design-system
      if (content.includes('@/components/ui/')) {
        content = content.replace(/@\/components\/ui\/([a-zA-Z0-9-]+)/g, "@vowos/design-system");
        changed = true;
      }
      if (content.includes('@/lib/utils')) {
        content = content.replace(/@\/lib\/utils/g, "@vowos/design-system");
        changed = true;
      }

      for (const {regex, replacement} of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Normalized: ${fullPath}`);
      }
    }
  }
}

console.log("Normalizing apps/marketing/src:");
normalizeDirectory('apps/marketing/src');
console.log("\nNormalizing apps/vowos-marketing/src:");
normalizeDirectory('apps/vowos-marketing/src');
