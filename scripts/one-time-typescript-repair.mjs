import fs from 'node:fs';

const root = process.cwd();

function replaceRequired(path, from, to, expectedMinimum = 1) {
  const full = `${root}/${path}`;
  const before = fs.readFileSync(full, 'utf8');
  const occurrences = before.split(from).length - 1;
  if (occurrences < expectedMinimum) {
    throw new Error(`${path}: expected at least ${expectedMinimum} occurrence(s), found ${occurrences}: ${JSON.stringify(from)}`);
  }
  const after = before.split(from).join(to);
  fs.writeFileSync(full, after);
  console.log(`${path}: replaced ${occurrences} occurrence(s)`);
}

replaceRequired(
  'apps/marketing/src/components/vowos/OwnerExecutiveOverview.tsx',
  "  Sparkles\n, MapPin} from 'lucide-react';",
  "  Sparkles\n} from 'lucide-react';",
);
replaceRequired(
  'apps/marketing/src/components/vowos/OwnerExecutiveOverview.tsx',
  'size="xs"',
  'size="sm"',
  4,
);

replaceRequired(
  'apps/marketing/src/components/vowos/mobile/MobileAppointment360.tsx',
  "  AlertTriangle\n, MapPin} from 'lucide-react';",
  "  AlertTriangle\n} from 'lucide-react';",
);

replaceRequired(
  'apps/marketing/src/components/vowos/payroll/PayrollScopeBar.tsx',
  "  RefreshCw \n, MapPin} from 'lucide-react';",
  "  RefreshCw \n} from 'lucide-react';",
);

replaceRequired(
  'apps/marketing/src/components/vowos/SetupWidget.tsx',
  ' className="h-1.5 flex-1 bg-white/10" indicatorClassName="bg-brand-primary"',
  ' className="h-1.5 flex-1 bg-white/10 [&>div]:bg-brand-primary"',
);

replaceRequired(
  'apps/marketing/src/components/vowos/TimeClockCard.tsx',
  '<ShieldAlert className="h-3.5 w-3.5 text-red-500" title="Geofence verification failed" />',
  '<span title="Geofence verification failed"><ShieldAlert className="h-3.5 w-3.5 text-red-500" aria-label="Geofence verification failed" /></span>',
);

replaceRequired(
  'apps/marketing/src/components/vowos/lead-generator/LeadGeneratorWizard.tsx',
  "'proper-br'",
  "'pc-br'",
);
replaceRequired(
  'apps/marketing/src/components/vowos/lead-generator/LeadGeneratorWizard.tsx',
  "'proper-cov'",
  "'pc-cov'",
);

replaceRequired(
  'apps/marketing/src/lib/services/leadIntelligenceService.ts',
  "boutiqueId: 'ido-br' | 'ido-cov' | 'all';",
  "boutiqueId: 'ido-br' | 'ido-cov' | 'pc-br' | 'pc-cov' | 'all';",
  2,
);

replaceRequired(
  'apps/marketing/src/components/vowos/mobile/MobilePayroll.tsx',
  "=== 'in_progress'",
  "=== 'active'",
);

console.log('Deterministic TypeScript repair pass complete.');
