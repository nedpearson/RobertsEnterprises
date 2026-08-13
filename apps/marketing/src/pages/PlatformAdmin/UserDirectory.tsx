import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';

export default function UserDirectory() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // In a real app, a Super Admin might call an RPC `get_platform_users` 
      // or we query `platform_users` and join `staff_profiles` + `auth.users` via a secure RPC.
      // For now, we simulate fetching users by querying staff_profiles and business_memberships.
      const { data, error } = await supabase
        .from('business_memberships')
        .select(`
          user_id,
          role,
          status,
          staff_profiles (name, email),
          businesses (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Platform User Directory</CardTitle>
            <CardDescription>All authenticated users across all tenants.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
              <Input placeholder="Search by email or name..." className="pl-9 w-[300px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((mem, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="font-medium">{mem.staff_profiles?.name || 'Unknown'}</div>
                    <div className="text-xs text-stone-500">{mem.staff_profiles?.email || mem.user_id}</div>
                  </TableCell>
                  <TableCell>{mem.businesses?.name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{mem.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mem.status === 'ACTIVE' ? 'default' : 'secondary'}>{mem.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-stone-500">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
