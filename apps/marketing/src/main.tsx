import './polyfills/stringReplaceAll';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initTenantConfig, resetTenantConfigForRetry } from './lib/supabase';
import { installTenantScopedApiFetch } from './lib/api/tenantScopedFetch';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('VowOS root element is missing.');
const root = createRoot(rootElement);

function renderBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Tenant configuration is temporarily unavailable.';

  root.render(
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-card p-8 shadow-sm text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">VowOS</p>
        <h1 className="mt-3 text-2xl font-semibold">We couldn't open this workspace</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The workspace configuration could not be verified. No demo or fallback business data has been loaded.
        </p>
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground" role="status">
          {message}
        </p>
        <button
          type="button"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => {
            resetTenantConfigForRetry();
            window.location.reload();
          }}
        >
          Retry
        </button>
      </section>
    </main>,
  );
}

// Service-role API routes need the active workspace on OAuth/bootstrap GETs.
// Install this before React renders so Settings, Growth, Shopify, and Meta all
// use the same verified tenant context from the first request onward.
installTenantScopedApiFetch();

initTenantConfig()
  .then(() => {
    root.render(<App />);
  })
  .catch(renderBootstrapError);
