import { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export interface MobileMoreAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface MobileMoreActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  actions: MobileMoreAction[];
  footer?: ReactNode;
}

/**
 * Bottom sheet used as an overflow menu (kebab/MoreVertical) on mobile.
 * Each action is a 44px+ touch target, safe-area aware.
 */
export function MobileMoreActionsSheet({
  open,
  onOpenChange,
  title = 'Actions',
  actions,
  footer,
}: MobileMoreActionsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm font-semibold text-muted-foreground">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-2 pb-4 flex flex-col gap-0.5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                disabled={action.disabled}
                onClick={() => {
                  action.onSelect();
                  onOpenChange(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors min-h-[48px] text-left',
                  'hover:bg-muted active:bg-muted/70 disabled:opacity-50 disabled:pointer-events-none',
                  action.destructive
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center',
                    action.destructive ? 'bg-destructive/10' : 'bg-muted/60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="flex-1">{action.label}</span>
              </button>
            );
          })}
        </div>
        {footer && <div className="px-4 pb-4">{footer}</div>}
      </DrawerContent>
    </Drawer>
  );
}
