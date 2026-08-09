import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useBusiness, useCustomers, useServices, useStaffProfiles, useAssignAppointmentRequest } from '@/lib/services/schedulingService';
import { useVowosData } from '@/contexts/VowosDataContext';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: { start_at?: string; employee_id?: string } | null;
}

export function NewAppointmentModal({ isOpen, onClose, initialData }: NewAppointmentModalProps) {
  const queryClient = useQueryClient();
  const { activeLocation } = useVowosData();
  const { data: business } = useBusiness();
  const businessId = business?.id;
  
  const { data: customers = [] } = useCustomers(businessId);
  const { data: services = [] } = useServices(businessId);
  const { data: staff = [] } = useStaffProfiles();
  const assignAppointment = useAssignAppointmentRequest();
  
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [employeeId, setEmployeeId] = useState(initialData?.employee_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setCustomerId('');
      setServiceId('');
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!customerId || !serviceId || !employeeId) {
      toast.error('Please select customer, service, and employee.');
      return;
    }
    if (!businessId || !activeLocation) {
      toast.error('Missing business or location context.');
      return;
    }
    if (!initialData?.start_at) {
      toast.error('Missing start time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const preferredDate = initialData?.start_at 
        ? new Date(initialData.start_at).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];

      // 1. Create Request
      const requestPayload = {
        business_id: businessId,
        customer_id: customerId,
        service_id: serviceId,
        preferred_location_id: activeLocation,
        preferred_date_1: preferredDate,
        status: 'pending',
        channel: 'in-person'
      };

      const { data: reqData, error: reqError } = await supabase.from('appointment_requests').insert(requestPayload).select().single();
      if (reqError) throw reqError;
      
      // 2. Assign directly using RPC (this enforces shift/conflict validation)
      const service = services.find((s: any) => s.id === serviceId);
      const durationMs = (service?.duration_minutes || 60) * 60 * 1000;
      const startAt = new Date(initialData.start_at);
      const endAt = new Date(startAt.getTime() + durationMs);

      await assignAppointment.mutateAsync({
        requestId: reqData.id,
        employeeId: employeeId,
        roomId: '00000000-0000-0000-0000-000000000000', // Default room for MVP
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString()
      });
      
      toast.success('Appointment booked successfully!');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to book appointment. Ensure employee is scheduled and has no conflicts.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Appointment Booking</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          {initialData?.start_at && (
            <div className="bg-muted/50 p-3 rounded-md text-sm text-muted-foreground flex justify-between items-center">
              <span>Selected Date:</span>
              <span className="font-medium text-foreground">
                {new Date(initialData.start_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Search or select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member..." />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
