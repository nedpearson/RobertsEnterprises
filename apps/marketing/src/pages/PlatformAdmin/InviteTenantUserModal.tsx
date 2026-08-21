
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

export function InviteTenantUserModal({ open, onOpenChange, tenantId, onSuccess }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Stylist');
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email || !password || !name) {
      toast({ title: 'Missing fields', description: 'Email, password, and name are required.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create a temporary Supabase client to avoid logging out the current super admin
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase configuration');

      const inviteClient = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });

      // 2. Create the user in auth.users, passing skip_auto_provision so they don't get a default business
      const { data, error } = await inviteClient.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim(),
            role: role,
            skip_auto_provision: 'true'
          }
        }
      });

      if (error) throw new Error(error.message);
      if (!data?.user) throw new Error('Failed to create user account');

      // 3. Add them to the tenant using our super admin RPC
      const { error: rpcError } = await supabase.rpc('platform_add_tenant_user', {
        p_business_id: tenantId,
        p_user_id: data.user.id,
        p_role: role
      });

      if (rpcError) throw new Error(rpcError.message);

      toast({ title: 'User invited', description: `${email} has been added to the tenant.` });
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
      setRole('Stylist');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User (Support)</DialogTitle>
          <DialogDescription>
            Create a new user account and attach it directly to this tenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Temporary Password</Label>
            <Input type="password" placeholder="Required for account creation" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Owner">Owner</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Stylist">Stylist</SelectItem>
                <SelectItem value="Support">Support</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleInvite} disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
