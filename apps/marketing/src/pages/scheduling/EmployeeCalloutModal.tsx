import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@vowos/design-system';
import { Input } from '@vowos/design-system';
import { Label } from '@vowos/design-system';
import { useStaffProfiles, useAppointments, useEmployeeSchedules } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, CalendarClock, UserX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@vowos/design-system';

export function EmployeeCalloutModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { activeLocation } = useVowosData();
  const { tenant } = useAuth();
  const businessId = tenant?.id || '';
  const { data: staff = [] } = useStaffProfiles();
  const { data: appointments = [] } = useAppointments(businessId, activeLocation);
  const { data: schedules = [] } = useEmployeeSchedules(businessId, activeLocation);
  const queryClient = useQueryClient();

  const [employeeId, setEmployeeId] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedEmployee = staff.find((s: any) => s.id === employeeId);

  // Find impacted shift and appointments
  const impactedShift = schedules.find((s: any) => 
    s.employee_id === employeeId && 
    s.shift_date === dateStr &&
    s.status === 'published'
  );

  const impactedAppointments = appointments.filter((a: any) => {
    if (a.employee_id !== employeeId || a.status === 'Canceled') return false;
    const apptDate = a.start_at ? new Date(a.start_at).toISOString().split('T')[0] : '';
    return apptDate === dateStr;
  });

  const handleExecuteCallout = async () => {
    if (!employeeId || !dateStr) return;
    setIsProcessing(true);

    try {
      // 1. Cancel the shift
      if (impactedShift) {
        await supabase.from('employee_schedules')
          .update({ status: 'canceled' })
          .eq('id', impactedShift.id);
      }

      // 2. Reassign appointments via AI (Simulated for now due to lack of batch RPC)
      // We will just cancel them and create new requests for them so the AI can assign them.
      for (const appt of impactedAppointments) {
        await supabase.from('appointments').update({ status: 'Canceled', confirmation_status: 'Canceled' }).eq('id', appt.id);
        
        // Push back into the request queue
        if (appt.request_id) {
            await supabase.from('appointment_requests').update({ status: 'new' }).eq('id', appt.request_id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      
      toast.success('Callout processed. Appointments moved to AI Planner queue.');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to process callout');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-500" />
            Process Employee Callout
          </DialogTitle>
          <DialogDescription>
            Record an unexpected absence. The AI Planner will immediately attempt to reassign impacted appointments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Employee</Label>
            <div className="col-span-3">
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Date</Label>
            <Input 
              type="date" 
              className="col-span-3" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right font-medium">Reason</Label>
            <Input 
              placeholder="e.g., Sick, Personal Emergency"
              className="col-span-3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {employeeId && dateStr && (
            <Alert variant="destructive" className="mt-4 bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Impact Analysis</AlertTitle>
              <AlertDescription className="mt-2 text-sm space-y-1">
                {impactedShift ? (
                  <p>• <strong>1 Shift</strong> will be canceled ({impactedShift.start_time} - {impactedShift.end_time})</p>
                ) : (
                  <p>• No published shift found for this date.</p>
                )}
                <p>• <strong>{impactedAppointments.length} Appointments</strong> will be sent to the AI Planner for immediate reassignment.</p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleExecuteCallout}
            disabled={!employeeId || isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Execute Callout & Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

