import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Smile, Frown, Meh } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

import { useCompleteAppointment } from '@/lib/services/schedulingService';

interface OutcomeModalProps {
  appointment: any;
  isOpen: boolean;
  onClose: () => void;
}

export function OutcomeModal({ appointment, isOpen, onClose }: OutcomeModalProps) {
  const [revenue, setRevenue] = useState('');
  const [sentiment, setSentiment] = useState('positive');
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();
  const completeMutation = useCompleteAppointment();

  const handleComplete = async () => {
    if (!appointment) return;
    
    try {
      const outcomeText = `Revenue: $${revenue || '0.00'}. Sentiment: ${sentiment}`;
      await completeMutation.mutateAsync({
        appointmentId: appointment.id,
        outcome: outcomeText,
        notes: notes
      });
      
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Appointment</DialogTitle>
          <DialogDescription>
            Record the outcome for {appointment?.customer?.first_name}'s visit.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="revenue" className="text-right">Revenue collected</Label>
            <div className="col-span-3 relative">
              <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="revenue"
                type="number"
                placeholder="0.00"
                className="pl-8"
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right mt-2">Sentiment</Label>
            <RadioGroup defaultValue="positive" className="col-span-3 flex gap-4" value={sentiment} onValueChange={setSentiment}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="positive" id="r1" />
                <Label htmlFor="r1" className="flex items-center gap-1 cursor-pointer"><Smile className="h-4 w-4 text-green-500"/> Great</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neutral" id="r2" />
                <Label htmlFor="r2" className="flex items-center gap-1 cursor-pointer"><Meh className="h-4 w-4 text-amber-500"/> Neutral</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="negative" id="r3" />
                <Label htmlFor="r3" className="flex items-center gap-1 cursor-pointer"><Frown className="h-4 w-4 text-red-500"/> Poor</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">Wrap-up Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any specific follow ups needed?"
              className="col-span-3 min-h-[100px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={completeMutation.isPending}>Cancel</Button>
          <Button onClick={handleComplete} disabled={completeMutation.isPending}>
            {completeMutation.isPending ? 'Saving...' : 'Complete Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
