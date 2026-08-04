import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, footer, className = '' }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Trap focus
      setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable && focusable.length > 0) {
          (focusable[0] as HTMLElement).focus();
        }
      }, 10);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
        aria-hidden="true" 
      />
      
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={`relative w-full max-w-lg bg-gray-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
      >
        {title && (
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
            <h2 id="modal-title" className="text-xl font-semibold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="p-6 overflow-y-auto flex-1 text-gray-200">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 bg-black/30 border-t border-white/10 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
