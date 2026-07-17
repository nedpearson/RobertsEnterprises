import React from 'react';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📋', title, description, action }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '48px 24px', textAlign: 'center',
      color: 'var(--color-text-muted)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{title}</div>
      {description && <div style={{ fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>{description}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
