import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useStaffProfiles, useBusiness } from '@/lib/services/schedulingService';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface EmployeeShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  initialData?: { start?: string; end?: string; employee_id?: string; id?: string } | null;
}

export function EmployeeShiftModal({ isOpen, onClose, locationId, initialData }: EmployeeShiftModalProps) {
  const queryClient = useQueryClient();
  const { data: staff = [] } = useStaffProfiles();
  const { data: business } = useBusiness();
  
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && isOpen) {
      setEmployeeId(initialData.employee_id || '');
      if (initialData.start) {
        const start = new Date(initialData.start);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().substring(0, 5));
      }
      if (initialData.end) {
        const end = new Date(initialData.end);
        setEndTime(end.toTimeString().substring(0, 5));
      }
    } else if (isOpen) {
      setEmployeeId('');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('17:00');
    }
  }, [initialData, isOpen]);

  const handleSave = async () => {
    if (!employeeId || !date || !startTime || !endTime) {
      toast.error('Please fill out all required fields');
      return;
    }

    if (!business?.id || !locationId) {
      toast.error('Missing business or location context');
      return;
    }

    setIsSubmitting(true);
    try {
      const startObj = new Date(`${date}T${startTime}:00`);
      const endObj = new Date(`${date}T${endTime}:00`);

      const shiftData = {
        business_id: business.id,
        location_id: locationId,
        employee_id: employeeId,
        shift_date: date,
        start_at: startObj.toISOString(),
        end_at: endObj.toISOString(),
        status: 'published'
      };

      if (initialData?.id) {
        const { error } = await supabase.from('employee_schedules').update(shiftData).eq('id', initialData.id);
        if (error) throw error;
        toast.success('Shift updated successfully');
      } else {
        const { error } = await supabase.from('employee_schedules').insert(shiftData);
        if (error) throw error;
        toast.success('Shift added successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('employee_schedules').delete().eq('id', initialData.id);
      if (error) throw error;
      toast.success('Shift deleted');
      queryClient.invalidateQueries({ queryKey: ['employee_schedules'] });
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData?.id ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <Input type="date" className="col-span-3" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Start Time</Label>
            <Input type="time" className="col-span-3" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">End Time</Label>
            <Input type="time" className="col-span-3" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="flex justify-between w-full sm:justify-between">
          <div>
            {initialData?.id && (
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>Delete</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
