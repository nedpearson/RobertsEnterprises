import { useState, FormEvent } from 'react';
import { LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth, StaffRole, STAFF_ROLES, ROLE_DESCRIPTIONS } from '@/contexts/AuthContext';

import { Modal, inputCls, btnPrimary } from './ui';
import { InstallAppButton } from '@/components/pwa/InstallAppButton';

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signUp, signInAsDemo } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Stylist');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleDemoSignIn = async () => {
    setError(null);
    setBusy(true);
    const { error } = await signInAsDemo();
    setBusy(false);
    if (error) {
      setError(error);
    } else {
      setSuccess('Welcome to Demo Mode!');
      setTimeout(() => {
        handleClose();
        window.location.reload();
      }, 900);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(null);
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (mode === 'signin') {
        let { error } = await signIn(email.trim().toLowerCase(), password);
        
        // Auto-provision user account if credentials do not exist on this environment yet
        if (error && (error.toLowerCase().includes('invalid login credentials') || error.toLowerCase().includes('user not found'))) {
          const defaultName = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
          const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
          const signUpRes = await signUp(email.trim().toLowerCase(), password, formattedName, 'Stylist');
          error = signUpRes.error;
        }

        if (error) {
          setBusy(false);
          setError(error);
        } else {
          setSuccess('Opening VowOS Workspace…');
          setTimeout(() => {
            handleClose();
            window.location.reload();
          }, 900);
        }
      } else {
        if (!name.trim()) {
          setBusy(false);
          setError('Please enter your name.');
          return;
        }
        const { error } = await signUp(email, password, name.trim(), role);
        setBusy(false);
        if (error) {
          setError(error);
        } else {
          setSuccess('Account created — you are signed in!');
          setTimeout(() => {
            handleClose();
            window.location.reload();
          }, 1100);
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setBusy(false);
      setError(err?.message || 'An error occurred during authentication.');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title={mode === 'signin' ? 'Staff Sign In' : 'Create Staff Account'}>
      {success ? (
        <div className="flex flex-col items-center py-8">
          <CheckCircle2 className="h-12 w-12 text-status-success" />
          <p className="mt-3 font-medium text-stone-800">{success}</p>
        </div>
      ) : (
        <>
          {/* Mode toggle */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                reset();
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                reset();
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <UserPlus className="h-4 w-4" /> Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Full name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    placeholder="Dana Roberts"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-600">Role *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STAFF_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          role === r
                            ? 'border-brand-primary bg-brand-soft text-brand-primary ring-1 ring-rose-300'
                            : 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Email *</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@robertsenterprises.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Password *</label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
              {mode === 'signup' && <p className="mt-1 text-[11px] text-stone-400">At least 6 characters.</p>}
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-soft px-3 py-2.5 text-sm text-brand-primary-hover ring-1 ring-inset ring-focus-ring">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className={`${btnPrimary} w-full justify-center disabled:opacity-60`}>
              {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>

            {mode === 'signin' && (
              <div className="mt-8 border-t border-stone-200 pt-6">
                <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
                  <h4 className="font-serif text-lg text-stone-800">Demo Access</h4>
                  <p className="mt-1 text-xs text-stone-500">
                    Want to see Roberts Mobile in action without affecting real business data?
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDemoSignIn}
                    className="mt-4 w-full rounded-lg bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Launch Demo Mode
                  </button>
                </div>

                <div className="mt-4">
                  <InstallAppButton fullWidth variant="outline" className="border-stone-300 text-stone-700 hover:bg-stone-50" />
                </div>
              </div>
            )}

            <p className="text-center text-[11px] text-stone-400">
              Staff access is managed by The Boutique. Your role controls what you can edit.
            </p>
          </form>
        </>
      )}
    </Modal>
  );
}
