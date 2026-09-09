import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppointmentRequests, useUpdateAppointmentStatus } from '@/lib/services/schedulingService';
import { AlertCircle, UserPlus, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { isArchivedAppointmentRequestStatus } from '@/lib/services/bookingRequestBulk';
import { useNavigate } from 'react-router-dom';

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  businessId?: string;
  locationId: string | 'all';
  appointmentDate: string; // YYYY-MM-DD
}

export function WaitlistIntelligenceModal({ open, onOpenChange, appointmentId, businessId, locationId, appointmentDate }: WaitlistModalProps) {
  const { data: requests = [] } = useAppointmentRequests(businessId, locationId);
  const cancelMutation = useUpdateAppointmentStatus();
  const navigate = useNavigate();

  // Find brides who want this date
  const matchedBrides = requests.filter(req => {
    // Only look at pending or waitlist requests
    if (isArchivedAppointmentRequestStatus(req.status)) return false;
    
    const prefDate = req.preferences?.date;
    if (!prefDate) return false;
    
    return prefDate.startsWith(appointmentDate);
  });

  const handleCancel = async (notify: boolean) => {
    try {
      await cancelMutation.mutateAsync({
        appointmentId,
        status: 'Cancelled'
      });
      toast.success('Appointment cancelled successfully.');
      onOpenChange(false);
      
      if (notify && matchedBrides.length > 0) {
        // Just navigate to the first matched bride to text them
        const firstMatch = matchedBrides[0];
        toast.info(`Navigating to ${firstMatch.customer?.name || 'bride'} to send a notification.`);
        navigate(`/appointments?tab=booking-requests&appointmentId=${firstMatch.id}`);
      }
    } catch (e: any) {
      toast.error('Failed to cancel appointment: ' + e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Cancel Appointment</DialogTitle>
          <DialogDescription>Are you sure you want to cancel this appointment?</DialogDescription>
        </DialogHeader>
        
        {matchedBrides.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mt-2 mb-4">
            <h4 className="font-bold text-indigo-900 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Waitlist Intelligence Match</h4>
            <p className="text-sm text-indigo-700 mt-1">We found <strong>{matchedBrides.length} bride{matchedBrides.length === 1 ? '' : 's'}</strong> waiting for an appointment on {appointmentDate}.</p>
            <ul className="mt-2 space-y-1">
              {matchedBrides.slice(0, 3).map(b => (
                <li key={b.id} className="text-xs font-medium text-indigo-800 flex items-center gap-1.5">
                  <Phone className="h-3 w-3" /> {b.customer?.name || b.customer_name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep Appointment</Button>
          {matchedBrides.length > 0 ? (
            <>
              <Button variant="destructive" onClick={() => handleCancel(false)}>Just Cancel</Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleCancel(true)}>Cancel & Notify Waitlist</Button>
            </>
          ) : (
            <Button variant="destructive" onClick={() => handleCancel(false)}>Cancel Appointment</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
