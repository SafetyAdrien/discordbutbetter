import { ReactNode } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface AdaptiveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** Side for the tablet Sheet variant. Defaults to right. */
  side?: 'left' | 'right' | 'top' | 'bottom';
  /** Mobile presentation: 'drawer' (bottom sheet) or 'fullscreen'. Defaults to 'drawer'. */
  mobileVariant?: 'drawer' | 'fullscreen';
  className?: string;
  contentClassName?: string;
}

/**
 * Responsive container that renders:
 * - Mobile (< 768px): bottom Drawer or fullscreen sheet
 * - Tablet (768-1024px): side Sheet
 * - Desktop (≥ 1024px): centered Dialog
 */
export function AdaptiveSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  side = 'right',
  mobileVariant = 'drawer',
  className,
  contentClassName,
}: AdaptiveSheetProps) {
  const { isMobile, isTablet } = useBreakpoint();

  if (isMobile) {
    if (mobileVariant === 'fullscreen') {
      return (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className={cn('h-[100svh] w-full max-w-full p-0 rounded-none border-0', className)}>
            {title && (
              <DialogHeader className="px-4 py-3 border-b">
                <DialogTitle>{title}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </DialogHeader>
            )}
            <div className={cn('flex-1 overflow-y-auto', contentClassName)}>{children}</div>
          </DialogContent>
        </Dialog>
      );
    }
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={className}>
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
              {description && <DrawerDescription>{description}</DrawerDescription>}
            </DrawerHeader>
          )}
          <div className={cn('px-4 pb-6 max-h-[80svh] overflow-y-auto', contentClassName)}>
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (isTablet) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className={cn('w-full sm:max-w-lg p-0 flex flex-col', className)}>
          {title && (
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>{title}</SheetTitle>
              {description && <SheetDescription>{description}</SheetDescription>}
            </SheetHeader>
          )}
          <div className={cn('flex-1 overflow-y-auto p-6', contentClassName)}>{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={contentClassName}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}
