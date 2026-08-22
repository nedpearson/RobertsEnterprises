import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, ArrowRight, AlertOctagon } from 'lucide-react';

export default function RepairQueue() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active Repair Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-900">No active incidents</h3>
            <p className="text-stone-500 mt-1">The CI/CD pipeline is currently healthy. No automated repairs are running.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Repair History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-900">TypeScript Compilation Error</p>
                  <p className="text-sm text-stone-500 font-mono mt-1">TS2322: Type 'string' is not assignable to type 'number'.</p>
                  <div className="flex gap-2 mt-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">CI_FAILED</span>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">REPAIRING</span>
                    <ArrowRight className="w-4 h-4 text-stone-400" />
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">RECOVERED</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-stone-500">2 hours ago</span>
                <Button variant="outline" size="sm">View PR</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
