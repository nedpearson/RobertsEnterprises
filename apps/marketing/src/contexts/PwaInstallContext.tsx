import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export interface DiagnosticResult {
  manifestValid: boolean;
  manifestDetails: string;
  serviceWorkerActive: boolean;
  serviceWorkerDetails: string;
  iconsValid: boolean;
  iconsDetails: string;
  scopeValid: boolean;
  startUrlValid: boolean;
  online: boolean;
  supported: boolean;
  installed: boolean;
  standalone: boolean;
}

interface PwaInstallContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isOffline: boolean;
  updateAvailable: boolean;
  deferredPrompt: any;
  promptInstall: () => Promise<void>;
  updateApp: () => void;
  dismissInstall: () => void;
  clearDismissal: () => void;
  runDiagnostics: () => Promise<DiagnosticResult>;
  repairInstallation: () => Promise<void>;
}

const PwaInstallContext = createContext<PwaInstallContextType>({
  isInstallable: false,
  isInstalled: false,
  isStandalone: false,
  isIOS: false,
  isOffline: false,
  updateAvailable: false,
  deferredPrompt: null,
  promptInstall: async () => {},
  updateApp: () => {},
  dismissInstall: () => {},
  clearDismissal: () => {},
  runDiagnostics: async () => ({} as any),
  repairInstallation: async () => {},
});

export const usePwaInstall = () => useContext(PwaInstallContext);

export const PwaInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const {
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const checkDismissal = useCallback(() => {
    const dismissedTimeStr = localStorage.getItem('roberts_enterprises_mobile_install_dismissed_v2');
    if (!dismissedTimeStr) return false;
    const dismissedTime = parseInt(dismissedTimeStr, 10);
    if (isNaN(dismissedTime)) return false;
    // 24 hours expiration
    return Date.now() - dismissedTime <= 86400000;
  }, []);

  useEffect(() => {
    // Migrate old key if it exists
    const oldDismissed = localStorage.getItem('famousai_pwa_dismissed');
    if (oldDismissed) {
      localStorage.setItem('roberts_enterprises_mobile_install_dismissed_v2', oldDismissed);
      localStorage.removeItem('famousai_pwa_dismissed');
    }

    // Detect iOS (including modern iPads using desktop-style user-agent but touch-capable)
    const ua = window.navigator.userAgent;
    const isIOSDevice = (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(!!isIOSDevice);

    // Detect standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
    setIsInstalled(isStandaloneMode);

    // Handle offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle beforeinstallprompt (Android, Desktop Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only set installable if we haven't dismissed it within 24 hours
      if (!checkDismissal()) {
        setIsInstallable(true);
      }
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkDismissal]);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // For iOS, trigger isInstallable to show instructions
      setIsInstallable(true);
    }
  }, [deferredPrompt, isIOS]);

  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    localStorage.setItem('roberts_enterprises_mobile_install_dismissed_v2', Date.now().toString());
  }, []);

  const clearDismissal = useCallback(() => {
    localStorage.removeItem('roberts_enterprises_mobile_install_dismissed_v2');
    if (deferredPrompt || isIOS) {
      setIsInstallable(true);
    }
  }, [deferredPrompt, isIOS]);

  const updateApp = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const runDiagnostics = useCallback(async (): Promise<DiagnosticResult> => {
    const result: DiagnosticResult = {
      manifestValid: false,
      manifestDetails: 'Not checked',
      serviceWorkerActive: false,
      serviceWorkerDetails: 'Not checked',
      iconsValid: false,
      iconsDetails: 'Not checked',
      scopeValid: false,
      startUrlValid: false,
      online: navigator.onLine,
      supported: false,
      installed: false,
      standalone: false
    };

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    result.standalone = isStandaloneMode;
    result.installed = isStandaloneMode || isInstalled;

    const hasServiceWorker = 'serviceWorker' in navigator;
    const isIOSDevice = (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    result.supported = hasServiceWorker || isIOSDevice;

    try {
      const response = await fetch('/manifest.webmanifest');
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        const data = JSON.parse(text);

        if (!contentType.includes('application/manifest+json') && !contentType.includes('application/json')) {
          result.manifestDetails = `MIME type is "${contentType}" (expected application/manifest+json)`;
        } else {
          result.manifestDetails = 'Manifest fetched successfully with correct content-type';
        }

        const isNameCorrect = data.name === 'The Boutique Mobile';
        const isShortNameCorrect = data.short_name === 'VowOS';

        if (isNameCorrect && isShortNameCorrect) {
          result.manifestValid = true;
          result.scopeValid = data.scope === '/';
          result.startUrlValid = data.start_url === '/';
        } else {
          result.manifestDetails += ` (Name: "${data.name}", Short Name: "${data.short_name}")`;
        }

        const icons = data.icons || [];
        const has192 = icons.some((i: any) => i.sizes === '192x192' && i.src);
        const has512 = icons.some((i: any) => i.sizes === '512x512' && i.src);
        const hasMaskable = icons.some((i: any) => i.purpose === 'maskable');

        if (has192 && has512 && hasMaskable) {
          result.iconsValid = true;
          result.iconsDetails = 'Valid 192x192, 512x512, and maskable icons present';
        } else {
          result.iconsDetails = `Missing icons - 192x192: ${has192}, 512x512: ${has512}, maskable: ${hasMaskable}`;
        }
      } else {
        result.manifestDetails = `Failed to load manifest: HTTP ${response.status}`;
      }
    } catch (err: any) {
      result.manifestDetails = `Error checking manifest: ${err.message}`;
    }

    if (hasServiceWorker) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          result.serviceWorkerActive = true;
          result.serviceWorkerDetails = `Active service worker controlling scope: ${regs[0].scope}`;
        } else {
          result.serviceWorkerDetails = 'No service workers registered';
        }
      } catch (err: any) {
        result.serviceWorkerDetails = `Error checking service workers: ${err.message}`;
      }
    } else {
      result.serviceWorkerDetails = 'Service workers not supported by this browser';
    }

    return result;
  }, [isInstalled]);

  const repairInstallation = useCallback(async () => {
    // Unregister service workers for this origin
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (err) {
        console.error('SW unregistration failed:', err);
      }
    }

    // Delete caches owned by this application
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      } catch (err) {
        console.error('Cache clearance failed:', err);
      }
    }

    // Force reload
    window.location.reload();
  }, []);

  return (
    <PwaInstallContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isStandalone,
        isIOS,
        isOffline,
        updateAvailable,
        deferredPrompt,
        promptInstall,
        updateApp,
        dismissInstall,
        clearDismissal,
        runDiagnostics,
        repairInstallation,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
};
