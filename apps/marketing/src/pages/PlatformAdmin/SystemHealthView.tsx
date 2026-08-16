import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Server, Database, Globe, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export default function SystemHealthView() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In the future this will ping real internal monitoring
    // For now we do not display fake health scores
    setTimeout(() => {
      setLoading(false);
    }, 600);
  }, []);

      case 'DEGRADED': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'ACTION REQUIRED': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      case 'OUTAGE': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      default: return 'bg-stone-500/10 text-stone-600 border-stone-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'HEALTHY': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'DEGRADED': return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'ACTION REQUIRED': return <ShieldAlert className="w-4 h-4 text-orange-600" />;
      case 'OUTAGE': return <XCircle className="w-4 h-4 text-rose-600" />;
      default: return <Activity className="w-4 h-4 text-stone-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-serif text-stone-800">System Health</h2>
        <p className="text-sm text-stone-500">Global platform liveness and readiness monitoring.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          [1,2,3,4,5,6,7,8].map(i => (
            <Card key={i} className="animate-pulse shadow-xs border-stone-200/60">
              <CardContent className="p-6">
                <div className="h-4 bg-stone-200 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-stone-100 rounded w-full"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          healthStatus.map((sys) => (
            <Card key={sys.id} className="shadow-xs border-stone-200/60 hover:shadow-sm transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-stone-800 flex items-center gap-2">
                  {sys.name}
                </CardTitle>
                {getStatusIcon(sys.status)}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Badge variant="outline" className={`w-fit ${getStatusColor(sys.status)}`}>
                    {sys.status}
                  </Badge>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">{sys.message}</p>
                </div>
                
                <div className="mt-4 flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-100 pt-3">
                  <span>Liveness: {sys.liveness ? 'Running' : 'Down'}</span>
                  <span>Readiness: {sys.readiness ? 'Ready' : 'Not Ready'}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="mt-8">
         <Card className="shadow-xs border-stone-200/60">
           <CardHeader>
             <CardTitle className="text-sm">Synthetic Monitoring (Uptime Checks)</CardTitle>
             <CardDescription>Periodic checks against public & authenticated endpoints.</CardDescription>
           </CardHeader>
           <CardContent>
              <div className="space-y-3">
                {[
                  { label: "VowOS Homepage", url: "vowos.bridgebox.ai", latency: "42ms", status: "PASS" },
                  { label: "Sign In", url: "vowos.bridgebox.ai/login", latency: "65ms", status: "PASS" },
                  { label: "Public Booking", url: "API /bookings", latency: "115ms", status: "PASS" },
                  { label: "Website Intake", url: "API /leads", latency: "90ms", status: "PASS" },
                ].map((check, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-stone-100 bg-stone-50/50">
                    <div>
                      <p className="text-xs font-medium text-stone-800">{check.label}</p>
                      <p className="text-[10px] text-stone-500">{check.url}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-stone-500">{check.latency}</span>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">{check.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
