import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Glass morphism card for use on top of hero imagery.
 * backdrop-filter: blur(20px), hairline white border, 20px radius.
 */
export function GlassCard({ children, className, style }: GlassCardProps) {
  return (
    <div
      className={`rounded-[20px] ${className ?? ''}`}
      style={{
        background: 'var(--vowos-glass-bg)',
        border: '1px solid var(--vowos-glass-border)',
        backdropFilter: 'blur(var(--vowos-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--vowos-glass-blur))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
