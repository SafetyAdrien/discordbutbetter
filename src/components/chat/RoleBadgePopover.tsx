import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RoleIcon } from "./RoleIcon";

interface Role {
  id: string;
  name: string;
  color?: string | null;
  icon_url?: string | null;
  description?: string | null;
}

interface RoleBadgePopoverProps {
  role: Role;
}

export function RoleBadgePopover({ role }: RoleBadgePopoverProps) {
  if (!role.icon_url) return null;


  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-shrink-0 cursor-pointer inline-flex items-center self-center"
                onClick={(e) => e.stopPropagation()}
              >
                <RoleIcon role={role} size={20} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border-none px-2 py-1">
            <p translate="no" className="text-white text-xs font-medium">{role.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent side="top" align="start" className="w-64 p-3" sideOffset={8}>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: role.color ? `${role.color}20` : "hsl(var(--muted))" }}
          >
            <RoleIcon role={role} size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 translate="no" className="font-semibold text-sm truncate text-white">{role.name}</h4>
            {role.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{role.description}</p>}
            {!role.description && (
              <p className="text-xs text-muted-foreground/60 mt-1">Icône de rôle personnalisée pour {role.name}.</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
