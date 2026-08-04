import { type ReactNode } from 'react';
import { AuthProvider } from '../auth';
import { LocationProvider } from '../shared';
import { ToastProvider } from '../design-system/ToastContext';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Root provider composition component.
 * Wraps the app with all global context providers in the correct order.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <LocationProvider>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </LocationProvider>
  );
}
