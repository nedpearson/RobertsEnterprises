import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastVariant, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--color-success-soft)', border: 'var(--color-success)', icon: 'var(--color-success)' },
  error:   { bg: 'var(--color-danger-soft)',  border: 'var(--color-danger)',  icon: 'var(--color-danger)' },
  warning: { bg: 'var(--color-warning-soft)', border: 'var(--color-warning)', icon: 'var(--color-warning)' },
  info:    { bg: 'var(--color-info-soft)',    border: 'var(--color-info)',    icon: 'var(--color-info)' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.variant];
          return (
            <div key={t.id} role="alert" style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 8, padding: '12px 16px',
              boxShadow: 'var(--shadow)', maxWidth: 360,
              fontSize: 14, color: 'var(--color-text-primary)',
              pointerEvents: 'all', animation: 'slideUpFade 0.25s ease-out',
            }}>
              <span style={{ color: c.icon, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {ICONS[t.variant]}
              </span>
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
