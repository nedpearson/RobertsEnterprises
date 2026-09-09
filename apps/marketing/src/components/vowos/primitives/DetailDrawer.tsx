import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

/**
 * Persistent right-side detail drawer. Used by workspace tabs for record
 * detail without full-page navigation for small records.
 */
export function DetailDrawer({ open, onClose, title, children, width = '420px' }: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col"
        style={{ width, maxWidth: '90vw' }}
        aria-label={title}
      >
        <SheetHeader className="px-6 py-4 border-b border-vowos-hairline shrink-0">
          <SheetTitle className="font-serif text-lg">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
