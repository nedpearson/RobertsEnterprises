import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, CloudRain, ShieldCheck } from 'lucide-react';

export default function Deployments() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Production Deployments</span>
            <Button variant="outline" size="sm" disabled>Freeze Deployments</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-stone-900">Railway Deployment (c884e13)</p>
                  <p className="text-sm text-stone-500 mt-1">Post-deployment smoke tests passed. System is healthy.</p>
                  <div className="mt-2 text-xs font-mono text-stone-400">ID: dep_abc123 • Env: production</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">HEALTHY</span>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">Rollback</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
