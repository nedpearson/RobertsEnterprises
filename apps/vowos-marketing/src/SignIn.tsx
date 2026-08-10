import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Connect directly to Control Plane
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://klzzdgqxahglnifuwgke.databasepad.com';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'fake-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error('No user returned');

      // Find tenant
      const { data: memberships, error: memberErr } = await supabase
        .from('vowos_tenant_users')
        .select('tenant_id')
        .eq('user_id', data.user.id);

      if (memberErr) throw memberErr;
      if (!memberships || memberships.length === 0) {
         throw new Error('You do not belong to any active organizations.');
      }

      // For MVP, just pick the first tenant
      const tenantId = memberships[0].tenant_id;

      const { data: tenant, error: tenantErr } = await supabase
        .from('vowos_tenants')
        .select('primary_domain')
        .eq('id', tenantId)
        .single();

      if (tenantErr) throw tenantErr;

      // Redirect to tenant domain, passing the JWT (in a real app, use a secure short-lived exchange token)
      // For MVP, passing access token in hash fragment so it doesn't hit server logs
      window.location.href = `https://${tenant.primary_domain}/central-auth#access_token=${data.session?.access_token}&refresh_token=${data.session?.refresh_token}`;
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Sign in to VowOS</h1>
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '24px' }}>Welcome back. Enter your credentials to access your workspace.</p>
        
        {error && <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}
        
        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e5', boxSizing: 'border-box' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e5e5', boxSizing: 'border-box' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#000', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '8px', 
              fontWeight: 600, 
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
