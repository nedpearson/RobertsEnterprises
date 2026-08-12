import React from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { MousePointer2 } from 'lucide-react';

export const DemoCursorOverlay: React.FC = () => {
  const { cursor } = useDemo();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (!cursor.visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-all duration-500 ease-out flex items-center justify-center"
      style={{
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
        transform: 'translate(-5px, -5px)',
      }}
    >
      {isMobile ? (
        <div className="relative flex items-center justify-center">
          <div className="absolute h-5 w-5 bg-brand-primary rounded-full animate-pulse opacity-80" />
          {cursor.clicking && (
            <div className="absolute border-2 border-brand-primary rounded-full animate-ping opacity-50"
                 style={{ width: '60px', height: '60px' }} />
          )}
        </div>
      ) : (
        <div className="relative">
          <MousePointer2 className="h-7 w-7 text-brand-primary fill-rose-500 drop-shadow-md animate-bounce" />
          
          {/* Click ripple animation */}
          {cursor.clicking && (
            <span className="absolute -left-2 -top-2 h-10 w-10 rounded-full border-2 border-brand-primary bg-brand-primary/30 animate-ping" />
          )}

          {/* Touch ring indicator */}
          <span className="absolute -left-1 -top-1 h-8 w-8 rounded-full border border-brand-primary bg-rose-200/40 animate-pulse" />
        </div>
      )}
    </div>
  );
};
