import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { TENANT_WORKSPACE_PATH, setActiveBusinessId } from "@/config/hostConfig";
import { normalizeLegacyRole } from "@/lib/auth/authorization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type WorkspaceSummary = {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  status?: string | null;
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(searchParams.get("message"));
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) void handleRouting(session.user.id);
    });
  // Initial session routing is intentionally run once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRouting = async (userId: string) => {
    setLoading(true);
    try {
      const { data: adminData, error: adminError } = await supabase.rpc("is_super_admin");
      if (adminError) console.warn("Platform role lookup degraded:", adminError.message);
      if (adminData === true) {
        navigate("/platform");
        return;
      }

      const { data: memberships, error } = await supabase
        .from("business_memberships")
        .select(`
          business_id,
          role,
          status,
          businesses (
            id,
            name,
            slug,
            logo_url,
            status
          )
        `)
        .eq("user_id", userId)
        .eq("status", "ACTIVE");

      if (error) throw error;

      const eligible = (memberships || []).flatMap((membership: any) => {
        if (!normalizeLegacyRole(membership.role)) return [];
        const business = Array.isArray(membership.businesses)
          ? membership.businesses[0]
          : membership.businesses;
        return business?.id ? [business as WorkspaceSummary] : [];
      });
      const uniqueWorkspaces = [...new Map(eligible.map((workspace) => [workspace.id, workspace])).values()];

      if (uniqueWorkspaces.length === 0) {
        setActiveBusinessId(null);
        toast.error("You don't have an active authorized workspace yet.");
        setLoading(false);
        return;
      }

      const enterWorkspace = (businessId: string) => {
        setActiveBusinessId(businessId);
        navigate(TENANT_WORKSPACE_PATH);
      };

      if (uniqueWorkspaces.length === 1) {
        enterWorkspace(uniqueWorkspaces[0].id);
      } else {
        setActiveBusinessId(null);
        setWorkspaces(uniqueWorkspaces);
        setShowWorkspaceSelector(true);
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      setActiveBusinessId(null);
      toast.error("Failed to resolve routing. Please contact support.");
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
                setActiveBusinessId(workspace.id);
                navigate(TENANT_WORKSPACE_PATH);
              }}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{workspace.name}</h3>
                  <p className="text-sm text-stone-500">{workspace.slug || "Workspace"}</p>
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
            {message === "check-email" && (
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
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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
