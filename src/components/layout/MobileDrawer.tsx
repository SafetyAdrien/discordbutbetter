import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
}

export function MobileDrawer({ 
  isOpen, 
  onClose, 
  direction, 
  children,
  className 
}: MobileDrawerProps) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={cn(
          "fixed top-0 bottom-0 z-50 flex flex-col bg-card transition-transform duration-300 ease-out",
          direction === 'left' ? "left-0" : "right-0",
          direction === 'left' 
            ? (isOpen ? "translate-x-0" : "-translate-x-full")
            : (isOpen ? "translate-x-0" : "translate-x-full"),
          direction === 'left' ? "w-[85vw] max-w-sm" : "w-[75vw] max-w-xs",
          className
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground transition-colors",
            direction === 'left' ? "right-3" : "left-3"
          )}
        >
          <X className="w-4 h-4" />
        </button>
        
        {children}
      </div>
    </>
  );
}
