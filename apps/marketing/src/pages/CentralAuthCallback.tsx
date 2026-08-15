import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function CentralAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Expected format: /central-auth#access_token=xxx&refresh_token=yyy
    const hash = window.location.hash;
    if (!hash) {
      navigate('/login');
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth.setSession({
        access_token,
        refresh_token
      }).then(({ error }) => {
        if (error) {
          console.error("Central Auth Session Error:", error);
          navigate('/login');
        } else {
          // Clear hash and go to dashboard
          window.location.hash = '';
          const redirect = params.get('redirect') || '/';
          navigate(redirect);
        }
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f5]">
      <div className="flex flex-col items-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
        <p className="mt-4 text-sm text-stone-500 font-medium">Authenticating your VowOS session...</p>
      </div>
    </div>
  );
}
