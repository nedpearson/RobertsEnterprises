import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(searchParams.get('message'));
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);

  useEffect(() => {
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleRouting(session.user.id);
      }
    });
  }, []);

  const handleRouting = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Check Platform Super Admin
      const { data: adminData } = await supabase.rpc('is_super_admin');
      if (adminData === true) {
        const isLocal = window.location.hostname.includes('localhost');
        const currentHost = window.location.hostname;
        const base = isLocal ? 'localhost' : 'vowos.bridgebox.ai';
        
        // If we're already on the target domain, just navigate directly
        // to avoid an infinite redirect loop through /central-auth
        if (currentHost === base || (isLocal && currentHost === 'localhost')) {
          navigate('/platform');
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        const port = window.location.port ? `:${window.location.port}` : '';
        const scheme = isLocal ? 'http' : 'https';
        const domain = `${scheme}://${base}${port}`;
        
        if (session) {
          window.location.href = `${domain}/central-auth#access_token=${session.access_token}&refresh_token=${session.refresh_token}&redirect=/platform`;
        } else {
          window.location.href = `${domain}/platform`;
        }
        return;
      }

      // 2. Check Workspaces (Organizations)
      const { data: memberships, error } = await supabase
        .from('business_memberships')
        .select(`
          business_id,
          businesses (
            id,
            name,
            slug,
            logo_url,
            status
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ACTIVE');

      if (error) throw error;

      if (!memberships || memberships.length === 0) {
        toast.error("You don't have access to any workspaces yet.");
        setLoading(false);
        return;
      }

      const redirectToTenant = async (slug: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        
        const isLocal = window.location.hostname.includes('localhost');
        const port = window.location.port ? `:${window.location.port}` : '';
        const scheme = isLocal ? 'http' : 'https';
        const base = isLocal ? 'localhost' : 'bridgebox.ai';
        const domain = `${scheme}://${slug}.${base}${port}`;
        
        if (session) {
          window.location.href = `${domain}/central-auth#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
        } else {
          window.location.href = domain;
        }
      };

      if (memberships.length === 1) {
        // Log into the single workspace by redirecting to its subdomain
        const slug = (memberships[0].businesses as any).slug;
        await redirectToTenant(slug);
      } else {
        // Show Workspace Selector
        setWorkspaces(memberships.map((m: any) => m.businesses));
        setShowWorkspaceSelector(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to resolve routing. Please contact support.');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      await handleRouting(data.user.id);
    }
  };

  if (showWorkspaceSelector) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-6">Select a Workspace</h1>
        <div className="grid gap-4 w-full max-w-md">
          {workspaces.map((workspace) => (
            <Card 
              key={workspace.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => {
                const isLocal = window.location.hostname.includes('localhost');
                const port = window.location.port ? `:${window.location.port}` : '';
                const scheme = isLocal ? 'http' : 'https';
                const base = isLocal ? 'localhost' : 'bridgebox.ai';
                const domain = `${scheme}://${workspace.slug}.${base}${port}`;
                
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    window.location.href = `${domain}/central-auth#access_token=${session.access_token}&refresh_token=${session.refresh_token}`;
                  } else {
                    window.location.href = domain;
                  }
                });
              }}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{workspace.name}</h3>
                  <p className="text-sm text-stone-500">{workspace.slug}</p>
                </div>
                <Button variant="outline">Enter</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign into VowOS</CardTitle>
          <CardDescription>Welcome back to the platform.</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {message === 'check-email' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please check your email to verify your account before logging in.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" 
                required 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
