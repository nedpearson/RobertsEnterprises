import React from 'react';
import { useDemo } from '@/lib/demo/demoContext';
import { MousePointer2 } from 'lucide-react';

export const DemoCursorOverlay: React.FC = () => {
  const { cursor } = useDemo();

  if (!cursor.visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-all duration-500 ease-out"
      style={{
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
        transform: 'translate(-5px, -5px)',
      }}
    >
      {/* Pointer icon */}
      <div className="relative">
        <MousePointer2 className="h-7 w-7 text-rose-500 fill-rose-500 drop-shadow-md animate-bounce" />
        
        {/* Click ripple animation */}
        {cursor.clicking && (
          <span className="absolute -left-2 -top-2 h-10 w-10 rounded-full border-2 border-rose-500 bg-rose-500/30 animate-ping" />
        )}

        {/* Touch ring indicator */}
        <span className="absolute -left-1 -top-1 h-8 w-8 rounded-full border border-rose-400 bg-rose-200/40 animate-pulse" />
      </div>
    </div>
  );
};
