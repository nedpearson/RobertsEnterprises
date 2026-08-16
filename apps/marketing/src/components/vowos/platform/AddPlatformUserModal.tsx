import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AddPlatformUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddPlatformUserModal({ open, onOpenChange, onSuccess }: AddPlatformUserModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('PLATFORM_ADMIN');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !role) return;

    try {
      setIsSubmitting(true);
      
      const { data, error } = await supabase.rpc('invite_platform_user', {
        p_email: email,
        p_role: role
      });

      if (error) throw error;

      toast.success(data?.message || 'Platform user successfully assigned.');
      onSuccess();
      onOpenChange(false);
      setEmail('');
      setRole('PLATFORM_ADMIN');
    } catch (err: any) {
      console.error('Failed to assign platform user:', err);
      toast.error(err.message || 'Failed to assign platform user. Note: The user must already exist in auth.users.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Platform User</DialogTitle>
            <DialogDescription>
              Assign elevated VowOS Platform permissions to an existing authenticated user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@vowos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Platform Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLATFORM_OWNER">Platform Owner</SelectItem>
                  <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                  <SelectItem value="PLATFORM_SUPPORT">Platform Support</SelectItem>
                  <SelectItem value="PLATFORM_BILLING">Platform Billing</SelectItem>
                  <SelectItem value="PLATFORM_READ_ONLY">Platform Read-Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
