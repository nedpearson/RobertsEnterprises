import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, Settings, ExternalLink } from 'lucide-react';
import { UnifiedSchedulingWorkspace } from '@/pages/scheduling/UnifiedSchedulingWorkspace';
import { useDemo } from '@/lib/demo/demoContext';
import { Button } from '@/components/ui/button';

export default function AppointmentsWorkspace() {
  const navigate = useNavigate();
  const { isDemoMode } = useDemo();
  
  const bookingUrlPath = isDemoMode ? '/demoapp/book' : '/book';
  const fullBookingUrl = `${window.location.origin}${bookingUrlPath}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullBookingUrl);
    toast.success('Booking link copied to clipboard');
  };

  const handleOpenBooking = () => {
    window.open(fullBookingUrl, '_blank');
  };

  const handleSettings = () => {
    navigate('/settings?tab=booking');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-serif font-bold text-stone-900">Appointments</h1>
          <p className="text-stone-500">Manage your scheduling and bookings.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleOpenBooking} className="text-stone-700">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Booking Page
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="text-stone-700">
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleSettings} className="text-stone-700">
            <Settings className="mr-2 h-4 w-4" />
            Booking Settings
          </Button>
        </div>
      </div>

      <UnifiedSchedulingWorkspace />
    </div>
  );
}
