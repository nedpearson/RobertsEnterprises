import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PlatformRole } from '@/lib/auth/roles';
import { AddPlatformUserModal } from '@/components/vowos/platform/AddPlatformUserModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PlatformDirectoryUser {
  id?: string;
  email: string;
  platform_role: string;
  active: boolean;
  created_at: string;
}

interface TenantDirectoryUser {
  id: string;
  email: string;
  business_id?: string | null;
  business_name?: string | null;
  role: string;
  status?: string | null;
  created_at: string;
}

export default function UserDirectory() {
  const navigate = useNavigate();
  const [platformUsers, setPlatformUsers] = useState<PlatformDirectoryUser[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantDirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { userContext } = useAuth();

  const fetchDirectories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [platformRes, tenantRes] = await Promise.all([
        supabase.rpc('get_platform_directory'),
        supabase.rpc('get_tenant_user_directory'),
      ]);
      if (platformRes.error) throw platformRes.error;
      if (tenantRes.error) throw tenantRes.error;
      setPlatformUsers((platformRes.data || []) as PlatformDirectoryUser[]);
      setTenantUsers((tenantRes.data || []) as TenantDirectoryUser[]);
    } catch (err: any) {
      const message = err?.message?.includes('Unauthorized') || err?.code === '42501'
        ? 'Access denied: this account does not have Platform Admin privileges.'
        : err?.message || 'Failed to load user directories.';
      setPlatformUsers([]);
      setTenantUsers([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDirectories(); }, [fetchDirectories]);

  const needle = searchQuery.trim().toLowerCase();
  const filteredPlatformUsers = useMemo(() => platformUsers.filter((user) => !needle || [user.email, user.platform_role].some((value) => String(value || '').toLowerCase().includes(needle))), [platformUsers, needle]);
  const filteredTenantUsers = useMemo(() => tenantUsers.filter((user) => !needle || [user.email, user.business_name, user.role, user.status].some((value) => String(value || '').toLowerCase().includes(needle))), [tenantUsers, needle]);

  return (
    <div className="space-y-6">
      <AddPlatformUserModal open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen} onSuccess={() => void fetchDirectories()} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Directory</h2>
          <p className="text-muted-foreground">Platform staff and tenant identities from authoritative directory RPCs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-stone-500" /><Input placeholder="Search users, orgs, roles..." className="w-[280px] pl-9" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
          <Button variant="outline" size="icon" onClick={() => void fetchDirectories()} disabled={loading} aria-label="Refresh user directory"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
          {userContext?.platform_role === PlatformRole.PLATFORM_OWNER && <Button onClick={() => setIsInviteModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Platform User</Button>}
        </div>
      </div>

      {error && <Card className="border-red-200 bg-red-50"><CardContent className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium text-red-900">Directory unavailable</p><p className="text-sm text-red-700">{error}</p></div><Button variant="outline" size="sm" onClick={() => void fetchDirectories()}>Retry</Button></CardContent></Card>}

      <Tabs defaultValue="platform" className="space-y-4">
        <TabsList><TabsTrigger value="platform">Platform Staff ({platformUsers.length})</TabsTrigger><TabsTrigger value="tenant">Tenant Users ({tenantUsers.length})</TabsTrigger></TabsList>

        <TabsContent value="platform">
          <Card>
            <CardHeader><CardTitle>VowOS Platform Staff</CardTitle><CardDescription>Personnel with administrative access to the SaaS control plane.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>User / Email</TableHead><TableHead>Platform Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading && platformUsers.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : !error && filteredPlatformUsers.length === 0 ? <TableRow><TableCell colSpan={4} className="py-10 text-center text-stone-500">No platform staff match the current search.</TableCell></TableRow> : filteredPlatformUsers.map((user) => (
                    <TableRow key={user.id || `${user.email}:${user.platform_role}`}><TableCell className="font-medium">{user.email}</TableCell><TableCell><Badge variant={user.platform_role === 'PLATFORM_OWNER' ? 'destructive' : 'default'}>{user.platform_role}</Badge></TableCell><TableCell><Badge variant={user.active ? 'outline' : 'secondary'}>{user.active ? 'Active' : 'Suspended'}</Badge></TableCell><TableCell className="text-stone-500">{new Date(user.created_at).toLocaleDateString()}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2">Tenant Users <ShieldAlert className="h-4 w-4 text-orange-500" /></CardTitle><CardDescription>Global directory of customer users. Organization-level changes are made through Organization 360 / Support Mode.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Organization</TableHead><TableHead>Org Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {loading && tenantUsers.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-400" /></TableCell></TableRow> : !error && filteredTenantUsers.length === 0 ? <TableRow><TableCell colSpan={6} className="py-10 text-center text-stone-500">No tenant users match the current search.</TableCell></TableRow> : filteredTenantUsers.map((user) => (
                    <TableRow key={`${user.id}:${user.business_id || user.business_name}`}><TableCell><div className="font-medium">{user.email}</div><div className="text-xs text-stone-500">ID: {user.id.slice(0, 8)}…</div></TableCell><TableCell>{user.business_name || user.business_id || 'Unmapped'}</TableCell><TableCell><Badge variant="outline">{user.role}</Badge></TableCell><TableCell><Badge variant="secondary">{user.status || 'UNKNOWN'}</Badge></TableCell><TableCell className="text-stone-500">{new Date(user.created_at).toLocaleDateString()}</TableCell><TableCell className="text-right">{user.business_id ? <Button variant="outline" size="sm" onClick={() => navigate(`/platform/tenant/${user.business_id}`)}>View Organization</Button> : <span className="text-xs text-stone-400">No organization ID</span>}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
