import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PermissionToggle, PermissionState } from './permission-toggle';
import { Switch } from './switch';
import type { PermissionCategory, ServerPermission } from '@/constants/permissions';

interface PermissionCategoryAccordionProps {
  category: PermissionCategory;
  getPermissionState: (permission: ServerPermission) => PermissionState | boolean;
  onPermissionChange: (permission: ServerPermission, state: PermissionState | boolean) => void;
  disabled?: boolean;
  mode?: 'toggle' | 'switch'; // toggle = 3 states (deny/inherit/allow), switch = on/off
  showInherit?: boolean;
  modifiedCount?: number;
  isAdmin?: boolean;
}

export function PermissionCategoryAccordion({
  category,
  getPermissionState,
  onPermissionChange,
  disabled = false,
  mode = 'toggle',
  showInherit = true,
  modifiedCount = 0,
  isAdmin = false,
}: PermissionCategoryAccordionProps) {
  const [isOpen, setIsOpen] = useState(modifiedCount > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-3 text-left transition-colors",
          "hover:bg-muted/50",
          isOpen && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{category.label}</span>
          {modifiedCount > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
              {modifiedCount}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div className="border-t border-border">
          {category.permissions.map((perm) => {
            const state = getPermissionState(perm.key);
            const isPermissionDisabled = disabled || (isAdmin && perm.key !== 'administrator');

            return (
              <div
                key={perm.key}
                className={cn(
                  "flex items-center justify-between p-3 border-b border-border last:border-b-0 transition-colors",
                  mode === 'toggle' && state !== 'inherit' && "bg-muted/20",
                  mode === 'switch' && state === true && "bg-primary/5",
                  isPermissionDisabled && "opacity-50"
                )}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm font-medium truncate">{perm.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                </div>

                {mode === 'toggle' ? (
                  <PermissionToggle
                    value={state as PermissionState}
                    onChange={(newState) => onPermissionChange(perm.key, newState)}
                    disabled={isPermissionDisabled}
                    showInherit={showInherit}
                  />
                ) : (
                  <Switch
                    checked={state === true || isPermissionDisabled}
                    onCheckedChange={(checked) => onPermissionChange(perm.key, checked)}
                    disabled={isPermissionDisabled}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
