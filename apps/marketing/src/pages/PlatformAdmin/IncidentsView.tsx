import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertOctagon, Activity, Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { getIncidents, resolveIncident } from '@/lib/platform/platformDataSource';
import { usePlatformData } from '@/lib/platform/usePlatformData';
import { PlatformDemoBanner, PlatformTableState } from '@/components/platform/PlatformStates';
import { DeclareIncidentModal } from './components/DeclareIncidentModal';
import { IncidentDetailDrawer } from './components/IncidentDetailDrawer';

export default function IncidentsView() {
  const { toast } = useToast();
  const { data: incidents, error, refetch } = usePlatformData(useCallback(() => getIncidents(), []));
  const [declareModalOpen, setDeclareModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleResolve = async (id: string) => {
    if (!id) return;
    try {
      const res = await resolveIncident(id);
      if (res.success) {
        toast({
          title: "Incident Resolved",
          description: "Operational incident marked as resolved.",
        });
        refetch();
      } else {
        toast({
          title: "Failed to Resolve",
          description: res.message || "Failed to resolve incident.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Unexpected error resolving incident.",
        variant: "destructive",
      });
    }
  };

  const handleViewIncident = (inc: any) => {
    setSelectedIncident(inc);
    setDrawerOpen(true);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'SEV-1':
        return <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">{sev}</Badge>;
      case 'SEV-2':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">{sev}</Badge>;
      case 'SEV-3':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">{sev}</Badge>;
      default:
        return <Badge variant="outline">{sev}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Open</Badge>;
      case 'INVESTIGATING':
        return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Investigating</Badge>;
      case 'IDENTIFIED':
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">Identified</Badge>;
      case 'MONITORING':
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Monitoring</Badge>;
      case 'RESOLVED':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PlatformDemoBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-stone-800">Incident Management</h2>
          <p className="text-sm text-stone-500">Track and resolve platform-wide operational incidents.</p>
        </div>
        <Button className="bg-stone-900 text-white" onClick={() => setDeclareModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Declare Incident
        </Button>
      </div>

      <Card className="shadow-xs border-stone-200/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident ID</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Title / Description</TableHead>
              <TableHead>Customer Impact</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((inc) => (
              <TableRow key={inc.id}>
                <TableCell className="font-mono text-xs text-stone-500">{inc.id}</TableCell>
                <TableCell>{getSeverityBadge(inc.severity)}</TableCell>
                <TableCell>{getStatusBadge(inc.status)}</TableCell>
                <TableCell className="text-sm font-medium">{inc.title}</TableCell>
                <TableCell className="text-xs text-stone-500">{inc.affected}</TableCell>
                <TableCell className="text-xs text-stone-500">{inc.started}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mr-2"
                    onClick={() => handleViewIncident(inc)}
                  >
                    View
                  </Button>
                  {inc.status !== "RESOLVED" && (
                    <Button
                      onClick={() => handleResolve((inc as any).full_id || inc.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700"
                    >
                      Resolve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {incidents.length === 0 && (
              <PlatformTableState
                colSpan={7}
                error={error}
                empty="No incidents on record."
                emptyHint="Declare one when a platform-wide issue starts, so impact and timeline are captured from minute zero."
              />
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Declare Incident Modal */}
      <DeclareIncidentModal
        open={declareModalOpen}
        onOpenChange={setDeclareModalOpen}
        onIncidentDeclared={refetch}
      />

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer
        incident={selectedIncident}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onIncidentUpdated={refetch}
      />
    </div>
  );
}
