import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const isImageUrl = role.icon_url.startsWith("http");

  const iconElement = isImageUrl ? (
    <img src={role.icon_url} alt={role.name} className="w-5 h-5 object-contain" />
  ) : (
    <span className="text-xl leading-none">{role.icon_url}</span>
  );

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <button 
                className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform inline-flex items-center self-center translate-y-[0px]"
                onClick={(e) => e.stopPropagation()}
              >
                {iconElement}
              </button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent side="top" className="bg-popover border-none px-2 py-1">
            <p className="text-white text-xs font-medium">{role.name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent side="top" align="start" className="w-64 p-3" sideOffset={8}>
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: role.color ? `${role.color}20` : "hsl(var(--muted))" }}
          >
            {isImageUrl ? (
              <img src={role.icon_url} alt={role.name} className="w-6 h-6 object-contain" />
            ) : (
              <span className="text-xl">{role.icon_url}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate text-white">{role.name}</h4>
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
