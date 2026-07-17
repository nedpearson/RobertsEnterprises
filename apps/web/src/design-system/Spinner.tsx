

interface Props {
  size?: number;
  label?: string;
}

export function Spinner({ size = 24, label = 'Loading…' }: Props) {
  return (
    <div role="status" aria-label={label} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-muted)', fontSize: 14 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        style={{ animation: 'spin 0.8s linear infinite', color: 'var(--color-accent)', flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
      {label && <span>{label}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
      <Spinner size={32} label={label} />
    </div>
  );
}
