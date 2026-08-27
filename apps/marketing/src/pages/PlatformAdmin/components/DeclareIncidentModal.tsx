import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { declareIncident } from '@/lib/platform/platformDataSource';
import { AlertOctagon, Plus, ShieldAlert } from 'lucide-react';

interface DeclareIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIncidentDeclared: () => void;
}

export function DeclareIncidentModal({
  open,
  onOpenChange,
  onIncidentDeclared,
}: DeclareIncidentModalProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('SEV-2');
  const [status, setStatus] = useState('INVESTIGATING');
  const [affectedScope, setAffectedScope] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please provide a title describing the incident.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await declareIncident({
        title: title.trim(),
        severity,
        status,
        affected_scope: affectedScope.trim() || 'Platform Wide',
        description: description.trim() || undefined,
      });

      if (res.success) {
        toast({
          title: 'Incident Declared',
          description: `Operational incident declared with severity ${severity}.`,
        });
        setTitle('');
        setSeverity('SEV-2');
        setStatus('INVESTIGATING');
        setAffectedScope('');
        setDescription('');
        onOpenChange(false);
        onIncidentDeclared();
      } else {
        toast({
          title: 'Declaration Failed',
          description: res.message || 'Failed to declare incident.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Unexpected error declaring incident.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertOctagon className="w-5 h-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Operations</span>
            </div>
            <DialogTitle className="text-xl font-serif text-stone-900">
              Declare Platform Incident
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Declare an operational incident to track customer impact, severity, and resolution timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="inc-title" className="text-xs font-medium text-stone-700">
                Incident Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="inc-title"
                placeholder="e.g. Meta Ads API publishing failures or elevated Shopify latency"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-stone-700">Severity</Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="text-xs mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEV-1">SEV-1 (Critical Outage)</SelectItem>
                    <SelectItem value="SEV-2">SEV-2 (Major Feature Degraded)</SelectItem>
                    <SelectItem value="SEV-3">SEV-3 (Minor Issue / Partial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-stone-700">Initial Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="text-xs mt-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="IDENTIFIED">Identified</SelectItem>
                    <SelectItem value="MONITORING">Monitoring</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="inc-scope" className="text-xs font-medium text-stone-700">
                Affected Scope
              </Label>
              <Input
                id="inc-scope"
                placeholder="e.g. Omnichannel Marketing or Shopify Webhook Ingestion"
                value={affectedScope}
                onChange={(e) => setAffectedScope(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="inc-desc" className="text-xs font-medium text-stone-700">
                Summary & Initial Observations
              </Label>
              <Textarea
                id="inc-desc"
                placeholder="Provide context on symptoms, affected tenants, and active diagnostic actions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="text-xs mt-1 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              disabled={submitting || !title.trim()}
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? 'Declaring...' : 'Declare Incident'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
