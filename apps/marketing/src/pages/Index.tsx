import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import { VowosDataProvider } from '@/contexts/VowosDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/lib/demo/demoContext';
import { Navigate } from 'react-router-dom';

const Index: React.FC = () => {
  const { user, tenant, loading, signOut } = useAuth();
  const { isDemoMode } = useDemo();

  // The public live demo app is intentionally anonymous. Its authorization is
  // the isolated demo data plane, not a staff session. Real tenants retain the
  // normal authentication and active-organization requirements below.
  if (loading && !isDemoMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 p-6 text-stone-700">
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900" />
          Opening your workspace...
        </div>
      </main>
    );
  }

  if (!isDemoMode && !user) {
    return <Navigate to="/login" replace />;
  }

  // A signed-in account without a resolved organization used to return null,
  // leaving users on an indistinguishable blank screen. Membership lookups can
  // be delayed or fail independently of authentication, so expose recovery.
  if (!isDemoMode && !tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 p-6 text-stone-900">
        <section className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">VowOS</p>
          <h1 className="mt-3 text-2xl font-semibold">Your workspace is still being connected</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your account is active, but we could not finish loading its organization. Retry once, or sign out and back in.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
              onClick={() => window.location.reload()}
            >
              Retry workspace
            </button>
            <button
              type="button"
              className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }



  return (
    <AppProvider>
      <VowosDataProvider>
        <AppLayout />
      </VowosDataProvider>
    </AppProvider>
  );
};

export default Index;
