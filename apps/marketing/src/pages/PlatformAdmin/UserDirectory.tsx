import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Loader2, Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformRole } from '@/lib/auth/roles';

export default function UserDirectory() {
  const [platformUsers, setPlatformUsers] = useState<any[]>([]);
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { userContext } = useAuth();

  useEffect(() => {
    fetchDirectories();
  }, []);

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      const [platformRes, tenantRes] = await Promise.all([
        supabase.rpc('get_platform_directory'),
        supabase.rpc('get_tenant_user_directory')
      ]);

      if (platformRes.error) throw platformRes.error;
      if (tenantRes.error) throw tenantRes.error;

      setPlatformUsers(platformRes.data || []);
      setTenantUsers(tenantRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load user directories');
    } finally {
      setLoading(false);
    }
  };

  const handleInvitePlatformUser = () => {
    toast.info("Invite dialog to be implemented.");
  };

  const filteredPlatformUsers = platformUsers.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTenantUsers = tenantUsers.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Directory</h2>
          <p className="text-muted-foreground">Manage platform staff and audit tenant users.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" />
            <Input 
              placeholder="Search by email..." 
              className="pl-9 w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {userContext?.platform_role === PlatformRole.PLATFORM_OWNER && (
            <Button onClick={handleInvitePlatformUser}>
              <Plus className="mr-2 h-4 w-4" /> Add Platform User
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platform">Platform Staff</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="platform">
          <Card>
            <CardHeader>
              <CardTitle>VowOS Platform Staff</CardTitle>
              <CardDescription>Personnel with administrative access to the SaaS infrastructure.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User / Email</TableHead>
                    <TableHead>Platform Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlatformUsers.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.platform_role === 'PLATFORM_OWNER' ? 'destructive' : 'default'}>
                          {user.platform_role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'outline' : 'secondary'}>
                          {user.active ? 'Active' : 'Suspended'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPlatformUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-stone-500">
                        No platform staff found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Tenant Users <ShieldAlert className="h-4 w-4 text-orange-500" />
              </CardTitle>
              <CardDescription>Global directory of all customers. Modifications should be done via Organization Support Mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Org Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenantUsers.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{user.email}</div>
                        <div className="text-xs text-stone-500">ID: {user.id.substring(0, 8)}...</div>
                      </TableCell>
                      <TableCell>{user.business_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTenantUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-stone-500">
                        No tenant users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
