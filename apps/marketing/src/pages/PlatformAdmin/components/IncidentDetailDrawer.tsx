import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { updateIncident, resolveIncident } from '@/lib/platform/platformDataSource';
import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  Activity,
  Layers,
  FileText,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface IncidentDetailDrawerProps {
  incident: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncidentUpdated: () => void;
}

export function IncidentDetailDrawer({
  incident,
  open,
  onOpenChange,
  onIncidentUpdated,
}: IncidentDetailDrawerProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState(incident?.status || 'INVESTIGATING');
  const [severity, setSeverity] = useState(incident?.severity || 'SEV-2');
  const [affectedScope, setAffectedScope] = useState(incident?.affected || '');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (incident) {
      setStatus(incident.status || 'INVESTIGATING');
      setSeverity(incident.severity || 'SEV-2');
      setAffectedScope(incident.affected || incident.summary || 'Platform Wide');
    }
  }, [incident]);

  const handleStatusChange = async (newStatus: string) => {
    if (!incident) return;
    const targetId = incident.full_id || incident.id;
    setIsUpdating(true);
    setStatus(newStatus);

    try {
      if (newStatus === 'RESOLVED') {
        const res = await resolveIncident(targetId);
        if (res.success) {
          toast({ title: 'Incident Resolved', description: 'Incident marked as resolved.' });
          onIncidentUpdated();
        }
      } else {
        const res = await updateIncident(targetId, { status: newStatus });
        if (res.success) {
          toast({ title: 'Incident Updated', description: `Status updated to ${newStatus}.` });
          onIncidentUpdated();
        }
      }
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeverityChange = async (newSeverity: string) => {
    if (!incident) return;
    const targetId = incident.full_id || incident.id;
    setIsUpdating(true);
    setSeverity(newSeverity);

    try {
      const res = await updateIncident(targetId, { severity: newSeverity });
      if (res.success) {
        toast({ title: 'Severity Updated', description: `Severity set to ${newSeverity}.` });
        onIncidentUpdated();
      }
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!incident || isUpdating) return;
    const targetId = incident.full_id || incident.id;
    setIsUpdating(true);

    try {
      const res = await resolveIncident(targetId);
      if (res.success) {
        toast({ title: 'Incident Resolved', description: 'Operational incident closed successfully.' });
        setStatus('RESOLVED');
        onIncidentUpdated();
      } else {
        toast({ title: 'Resolve Failed', description: res.message, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
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

  const getStatusBadge = (st: string) => {
    switch (st) {
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
        return <Badge variant="outline">{st}</Badge>;
    }
  };

  if (!incident) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col h-full bg-stone-50/50">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span className="font-mono text-xs font-semibold text-stone-500">
                {incident.id || 'INCIDENT'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getSeverityBadge(severity)}
              {getStatusBadge(status)}
            </div>
          </div>
          <SheetTitle className="text-xl font-serif text-stone-900 leading-snug">
            {incident.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-stone-500 mt-1 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Started: {incident.started || 'Recorded'}
          </SheetDescription>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Controls Card */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-4">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-stone-500" />
              Incident Status & Triage
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                  Current Status
                </Label>
                <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="IDENTIFIED">Identified</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 block">
                  Severity Level
                </Label>
                <Select value={severity} onValueChange={handleSeverityChange} disabled={isUpdating}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEV-1">SEV-1 (Critical)</SelectItem>
                    <SelectItem value="SEV-2">SEV-2 (Major)</SelectItem>
                    <SelectItem value="SEV-3">SEV-3 (Minor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {status !== 'RESOLVED' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                onClick={handleResolve}
                disabled={isUpdating}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Mark Incident Resolved
              </Button>
            )}
          </div>

          {/* Scope & Impact Card */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-2">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Customer Impact / Affected Scope
            </h4>
            <p className="text-xs text-stone-800 bg-stone-50 p-3 rounded-lg border border-stone-200">
              {affectedScope || incident.affected || 'Platform Wide'}
            </p>
          </div>

          {/* Summary Details */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-xs space-y-2">
            <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              Summary & Diagnostic Notes
            </h4>
            <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
              {incident.summary || incident.description || 'No detailed diagnostic logs attached.'}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
