import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SystemHealthView() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In the future this will ping real internal monitoring
    // For now we do not display fake health scores
    setTimeout(() => {
      setLoading(false);
    }, 600);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">System Health</h2>
        <p className="text-sm text-stone-500">Global platform liveness and readiness monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse shadow-xs border-stone-200/60">
              <CardContent className="p-6">
                <div className="h-4 bg-stone-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-stone-100 rounded w-full"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full shadow-xs border-stone-200/60">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-stone-500">
              <Activity className="w-8 h-8 text-stone-300 mb-4" />
              <p className="text-sm font-medium">Health Monitoring Pending</p>
              <p className="text-xs">Real-time telemetry will be available when /api/platform/health is deployed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
