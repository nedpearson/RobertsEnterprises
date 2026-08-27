import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@vowos/design-system';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
}

export const EditRequestModal: React.FC<EditRequestModalProps> = ({ isOpen, onClose, request }) => {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('submitted');
  const [service, setService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (request) {
      const parsedNotes = (() => {
        if (!request.notes) return {};
        const match = request.notes.match(/Form Data:\s*([\s\S]+)/);
        if (!match) return {};
        try {
          const raw = JSON.parse(match[1]);
          const clean: Record<string, any> = {};
          for (const [k, v] of Object.entries(raw)) {
            const cleanKey = k.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').replace(/\*/g, '').trim();
            clean[cleanKey] = v;
          }
          return clean;
        } catch {
          return {};
        }
      })();

      const name = request.customer?.name || (request.customer?.first_name ? `${request.customer.first_name} ${request.customer.last_name || ''}`.trim() : null) || parsedNotes['First and Last Name'] || parsedNotes['First + Last Name'] || '';
      const ph = request.customerPhone || request.customer?.phone || parsedNotes['Contact Phone'] || parsedNotes['Phone'] || '';
      const em = request.customerEmail || request.customer?.email || parsedNotes['Email'] || '';
      const srv = request.service?.name || parsedNotes['Occasion Type'] || parsedNotes['Service'] || 'Bridal Appointment';

      setCustomerName(name);
      setPhone(ph);
      setEmail(em);
      setStatus(request.status || 'submitted');
      setService(srv);
    }
  }, [request]);

  const handleSave = async () => {
    if (!request?.id) return;
    setIsSubmitting(true);
    try {
      // 1. Update Customer Record if customer_id exists
      if (request.customer_id) {
        await supabase.from('customers').update({
          name: customerName,
          email,
          phone
        }).eq('id', request.customer_id);
      }

      // 2. Update Appointment Request status
      await supabase.from('appointment_requests').update({
        status
      }).eq('id', request.id);

      toast.success('Appointment request updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['appointment_requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    } catch (err: any) {
      toast.error('Failed to update request: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Edit Appointment Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1">
            <Label>Customer Name</Label>
            <Input 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
              placeholder="e.g. Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone Number</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="555-000-0000"
              />
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="jane@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Service / Occasion</Label>
              <Input 
                value={service} 
                onChange={(e) => setService(e.target.value)} 
                placeholder="e.g. Bridal Appointment"
              />
            </div>
            <div className="space-y-1">
              <Label>Request Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="new">New Inquiry</SelectItem>
                  <SelectItem value="review">Staffing Review</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="waitlist">Waitlist</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSubmitting} className="bg-brand-primary text-white">
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
