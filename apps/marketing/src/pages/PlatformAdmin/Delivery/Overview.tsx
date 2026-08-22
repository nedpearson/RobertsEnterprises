import React from 'react';
import { ShieldAlert, CheckCircle2, GitBranch, RefreshCw, ServerCrash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function Overview() {
  const isHealthy = true; // In reality, fetch from API

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">GitHub Main</p>
                <p className="text-2xl font-bold font-mono">c884e13</p>
              </div>
              <GitBranch className="w-8 h-8 text-stone-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Latest Tested CI</p>
                <p className="text-2xl font-bold font-mono">c884e13</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Railway Deployed</p>
                <p className="text-2xl font-bold font-mono">c884e13</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-500">Production</p>
                <p className="text-2xl font-bold font-mono">c884e13</p>
              </div>
              <ServerCrash className="w-8 h-8 text-stone-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Drift Monitor</CardTitle>
          <CardDescription>Continuous comparison of Git, CI, and live deployments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-green-50 text-green-800 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <p className="font-medium">IN SYNC</p>
              <p className="text-sm opacity-90">All systems are reporting the same release SHA.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
