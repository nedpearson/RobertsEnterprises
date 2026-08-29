/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, (reloadPage?: boolean) => Promise<void>];
    offlineReady: [boolean, (reloadPage?: boolean) => Promise<void>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
