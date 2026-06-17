import { ReactNode } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** When true on mobile, the drawer fills the dynamic viewport height. */
  fullscreenOnMobile?: boolean;
}

export function ResponsiveModal({ open, onOpenChange, title, children, className, fullscreenOnMobile }: ResponsiveModalProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn(fullscreenOnMobile && 'h-dvh', className)}>
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <div
            className={cn(
              'px-4 overflow-y-auto pb-safe',
              fullscreenOnMobile ? 'flex-1' : 'max-h-[80dvh]'
            )}
            style={{ paddingBottom: 'calc(1.5rem + var(--safe-bottom) + var(--kb-offset, 0px))' }}
          >
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
