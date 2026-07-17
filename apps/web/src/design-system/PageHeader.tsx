import React from 'react';

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: string[];
}

export function PageHeader({ title, description, actions, breadcrumb }: Props) {
  return (
    <div style={{
      padding: '24px 32px 20px',
      borderBottom: '1px solid var(--color-border-subtle)',
      background: 'var(--color-surface)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24,
      flexWrap: 'wrap',
    }}>
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', gap: 6 }}>
            {breadcrumb.map((crumb, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
                <span>{crumb}</span>
              </span>
            ))}
          </div>
        )}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(20px, 3vw, 26px)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          margin: 0, lineHeight: 1.2,
        }}>{title}</h1>
        {description && (
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>{description}</p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}
