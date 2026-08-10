import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@vowos/design-system';
import { Button } from '@vowos/design-system';
import { Label } from '@vowos/design-system';
import { Input } from '@vowos/design-system';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@vowos/design-system';
import { useStaffProfiles, useBusiness } from '@/lib/services/schedulingService';
import { 
  useCreateEmployeeSchedule, 
  useUpdateEmployeeSchedule, 
  useDeleteEmployeeSchedule 
} from '@/lib/services/schedulingService';
import { toast } from 'sonner';
import { Textarea } from '@vowos/design-system';

export interface EmployeeShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  initialData?: { 
    id?: string;
    employee_id?: string; 
    start?: string; 
    end?: string; 
    shift_type?: string;
    department?: string;
    unpaid_break_minutes?: number;
    paid_break_minutes?: number;
    notes?: string;
  } | null;
}

export function EmployeeShiftModal({ isOpen, onClose, locationId, initialData }: EmployeeShiftModalProps) {
  const { data: staff = [] } = useStaffProfiles();
  const { data: business } = useBusiness();
  
  const createMutation = useCreateEmployeeSchedule();
  const updateMutation = useUpdateEmployeeSchedule();
  const deleteMutation = useDeleteEmployeeSchedule();

  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shiftType, setShiftType] = useState('Regular');
  const [department, setDepartment] = useState('Sales');
  const [unpaidBreak, setUnpaidBreak] = useState('0');
  const [paidBreak, setPaidBreak] = useState('0');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialData && isOpen) {
      setEmployeeId(initialData.employee_id || '');
      if (initialData.start) {
        const start = new Date(initialData.start);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().substring(0, 5));
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setStartTime('09:00');
      }
      if (initialData.end) {
        const end = new Date(initialData.end);
        setEndTime(end.toTimeString().substring(0, 5));
      } else {
        setEndTime('17:00');
      }
      setShiftType(initialData.shift_type || 'Regular');
      setDepartment(initialData.department || 'Sales');
      setUnpaidBreak((initialData.unpaid_break_minutes || 0).toString());
      setPaidBreak((initialData.paid_break_minutes || 0).toString());
      setNotes(initialData.notes || '');
    } else if (isOpen) {
      setEmployeeId('');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('17:00');
      setShiftType('Regular');
      setDepartment('Sales');
      setUnpaidBreak('0');
      setPaidBreak('0');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleSave = async () => {
    if (!employeeId || !date || !startTime || !endTime) {
      toast.error('Please fill out Employee, Date, Start Time, and End Time');
      return;
    }

    if (!business?.id || !locationId) {
      toast.error('Missing business or location context');
      return;
    }

    const startObj = new Date(`${date}T${startTime}:00`);
    const endObj = new Date(`${date}T${endTime}:00`);

    const shiftData = {
      businessId: business.id,
      locationId,
      employeeId,
      shiftDate: date,
      startAt: startObj.toISOString(),
      endAt: endObj.toISOString(),
      status: 'published',
      shiftType,
      department,
      unpaidBreakMinutes: parseInt(unpaidBreak) || 0,
      paidBreakMinutes: parseInt(paidBreak) || 0,
      notes
    };

    try {
      if (initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, ...shiftData });
        toast.success('Shift updated successfully');
      } else {
        await createMutation.mutateAsync(shiftData);
        toast.success('Shift added successfully');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save shift');
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    try {
      await deleteMutation.mutateAsync(initialData.id);
      toast.success('Shift deleted');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete shift');
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
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
            <Label className="text-right">Shift Type</Label>
            <Select value={shiftType} onValueChange={setShiftType}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Opening">Opening</SelectItem>
                <SelectItem value="Closing">Closing</SelectItem>
                <SelectItem value="Training">Training</SelectItem>
                <SelectItem value="On-Call">On-Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sales">Sales (Bridal)</SelectItem>
                <SelectItem value="Alterations">Alterations</SelectItem>
                <SelectItem value="Front Desk">Front Desk</SelectItem>
                <SelectItem value="Management">Management</SelectItem>
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

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-xs">Unpaid Break (min)</Label>
            <Input type="number" className="col-span-1" value={unpaidBreak} onChange={e => setUnpaidBreak(e.target.value)} min="0" />
            
            <Label className="text-right text-xs">Paid Break (min)</Label>
            <Input type="number" className="col-span-1" value={paidBreak} onChange={e => setPaidBreak(e.target.value)} min="0" />
          </div>

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">Notes</Label>
            <Textarea 
              className="col-span-3 resize-none" 
              rows={2} 
              placeholder="Internal notes for this shift..."
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
            />
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
            <Button onClick={handleSave} disabled={isSubmitting}>Save Shift</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
