import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, ShieldCheck, PlayCircle, GitCommitHorizontal, Rocket } from 'lucide-react';

export default function ReleaseDashboardView() {
  const deployments = [
    {
      id: 'dpl_v2.14.0',
      version: 'v2.14.0',
      commit: 'a1b2c3d',
      status: 'HEALTHY',
      tests: {
        tenantIsolation: 'PASS',
        authorization: 'PASS',
        e2e: 'PASS',
        smoke: 'PASS',
      },
      deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: 'dpl_v2.13.9',
      version: 'v2.13.9',
      commit: '9f8e7d6',
      status: 'ROLLED_BACK',
      tests: {
        tenantIsolation: 'PASS',
        authorization: 'PASS',
        e2e: 'FAIL',
        smoke: 'FAIL',
      },
      deployedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-serif text-stone-800">Release Engineering</h2>
          <p className="text-stone-500 mt-1">Continuous QA, deployment health, and CI/CD operations.</p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Phase 12 Gate Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Rocket className="w-5 h-5 text-indigo-500" />
              <h3 className="font-medium text-stone-700">Current Production</h3>
            </div>
            <div className="text-3xl font-serif text-stone-900">v2.14.0</div>
            <p className="text-sm text-stone-500 mt-1 font-mono">commit: a1b2c3d</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <h3 className="font-medium text-stone-700">Certification Status</h3>
            </div>
            <div className="text-xl font-medium text-stone-900">100% Passed</div>
            <p className="text-sm text-stone-500 mt-1">0 P0/P1 Regressions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <PlayCircle className="w-5 h-5 text-blue-500" />
              <h3 className="font-medium text-stone-700">Test Execution</h3>
            </div>
            <div className="text-xl font-medium text-stone-900">324 Suites</div>
            <p className="text-sm text-stone-500 mt-1">Auto-ran on last PR</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommitHorizontal className="w-5 h-5" />
            Deployment History
          </CardTitle>
          <CardDescription>Recent releases and their certification results</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Isolation Tests</TableHead>
                <TableHead>Auth Tests</TableHead>
                <TableHead>E2E/Smoke</TableHead>
                <TableHead>Deployed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.version} <span className="text-xs text-stone-400 block font-mono">{d.commit}</span></TableCell>
                  <TableCell>
                    <Badge variant={d.status === 'HEALTHY' ? 'default' : 'destructive'} className={d.status === 'HEALTHY' ? 'bg-emerald-100 text-emerald-700' : ''}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                  </TableCell>
                  <TableCell>
                    {d.tests.e2e === 'PASS' ? (
                       <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> PASS</span>
                    ) : (
                       <span className="flex items-center gap-1 text-sm text-red-600"><XCircle className="w-3.5 h-3.5" /> FAIL</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-stone-500">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(d.deployedAt).toLocaleDateString()}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
