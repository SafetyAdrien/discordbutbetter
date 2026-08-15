import * as React from 'react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

export type ContextMenuItemDef = {
  type: 'item';
  label: string;
  icon?: React.ElementType;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export type ContextMenuSeparatorDef = {
  type: 'separator';
};

export type ContextMenuSubDef = {
  type: 'sub';
  label: string;
  icon?: React.ElementType;
  disabled?: boolean;
  items: ContextMenuDef[];
};

export type ContextMenuDef =
  | ContextMenuItemDef
  | ContextMenuSeparatorDef
  | ContextMenuSubDef;

interface UniversalContextMenuProps {
  items: ContextMenuDef[];
  children: React.ReactNode;
  className?: string;
}

function renderItems(items: ContextMenuDef[] | undefined): React.ReactNode {
  if (!items || items.length === 0) return null;
  return items.map((item, index) => {
    if (item.type === 'separator') {
      return <ContextMenuSeparator key={`sep-${index}`} />;
    }
    if (item.type === 'sub') {
      if (!item.items || item.items.length === 0) return null;
      const Icon = item.icon;
      return (
        <ContextMenuSub key={`sub-${index}-${item.label}`}>
          <ContextMenuSubTrigger disabled={item.disabled}>
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {item.label}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52">
            {renderItems(item.items)}
          </ContextMenuSubContent>
        </ContextMenuSub>
      );
    }
    const Icon = item.icon;
    return (
      <ContextMenuItem
        key={`item-${index}-${item.label}`}
        disabled={item.disabled}
        onClick={item.onClick}
        className={cn(item.destructive && 'text-destructive focus:text-destructive')}
      >
        {Icon && <Icon className="w-4 h-4 mr-2" />}
        {item.label}
      </ContextMenuItem>
    );
  });
}

export function UniversalContextMenu({ items, children, className }: UniversalContextMenuProps) {
  if (!items || items.length === 0) {
    return <>{children}</>;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className={cn('w-52', className)}>
        {renderItems(items)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Example usage:
// <UniversalContextMenu
//   items={[
//     { type: 'item', label: 'Voir le profil', icon: UserIcon, onClick: () => {} },
//     { type: 'separator' },
//     { type: 'sub', label: 'Gérer les rôles', icon: Shield, items: [
//       { type: 'item', label: 'Admin', onClick: () => {} },
//     ]},
//     { type: 'separator' },
//     { type: 'item', label: 'Bannir', icon: Ban, destructive: true, onClick: () => {} },
//   ]}
// >
//   <button>Clic droit ici</button>
// </UniversalContextMenu>
