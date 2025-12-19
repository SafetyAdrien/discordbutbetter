import { cn } from '@/lib/utils';
import { X, Minus, Check } from 'lucide-react';

export type PermissionState = 'deny' | 'inherit' | 'allow';

interface PermissionToggleProps {
  value: PermissionState;
  onChange: (state: PermissionState) => void;
  disabled?: boolean;
  showInherit?: boolean;
}

export function PermissionToggle({ 
  value, 
  onChange, 
  disabled = false,
  showInherit = true 
}: PermissionToggleProps) {
  return (
    <div className="flex items-center bg-muted/50 rounded-md p-0.5">
      {/* Deny Button */}
      <button
        type="button"
        onClick={() => onChange('deny')}
        disabled={disabled}
        className={cn(
          "p-1.5 rounded transition-all",
          value === 'deny' 
            ? "bg-destructive/20 text-destructive" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Inherit Button */}
      {showInherit && (
        <button
          type="button"
          onClick={() => onChange('inherit')}
          disabled={disabled}
          className={cn(
            "p-1.5 rounded transition-all",
            value === 'inherit' 
              ? "bg-muted-foreground/20 text-foreground" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Minus className="w-4 h-4" />
        </button>
      )}

      {/* Allow Button */}
      <button
        type="button"
        onClick={() => onChange('allow')}
        disabled={disabled}
        className={cn(
          "p-1.5 rounded transition-all",
          value === 'allow' 
            ? "bg-green-500/20 text-green-500" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Check className="w-4 h-4" />
      </button>
    </div>
  );
}
