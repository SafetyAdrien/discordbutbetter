import { useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Hash, AtSign } from "lucide-react";
import { cn, normalizeForSearch, formatChannelName } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uuidToSnowflake } from "@/lib/snowflake";

export interface MentionMember {
  id: string;
  displayName: string;
  username: string;
  avatar?: string;
}

export interface MentionRole {
  id: string;
  name: string;
  color: string | null;
}

export interface MentionChannel {
  id: string;
  name: string;
  type: string;
}

interface MentionAutocompleteProps {
  type: "user" | "channel" | "role";
  query: string;
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
  onSelect: (mention: string, displayText: string) => void;
  onClose: () => void;
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export function MentionAutocomplete({
  type,
  query,
  members = [],
  roles = [],
  channels = [],
  onSelect,
  onClose,
  selectedIndex,
  onIndexChange,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on query
  const suggestions = (() => {
    const q = query.toLowerCase();

    if (type === "user") {
      return members
        .filter((m) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
        .slice(0, 10);
    }

    if (type === "role") {
      // Include @everyone and @here as special options
      const specialRoles = [
        { id: "everyone", name: "everyone", color: "#5865f2" },
        { id: "here", name: "here", color: "#5865f2" },
      ].filter((r) => r.name.includes(q));

      const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 8);

      return [...specialRoles, ...filteredRoles];
    }

    if (type === "channel") {
      // Smart match: normalize query and channel names for comparison
      const normalizedQuery = normalizeForSearch(query);
      return channels.filter((c) => normalizeForSearch(c.name).includes(normalizedQuery)).slice(0, 10);
    }

    return [];
  })();

  // Scroll selected item into view
  useEffect(() => {
    const container = containerRef.current;
    if (container && selectedIndex >= 0) {
      const items = container.querySelectorAll("[data-mention-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  const handleSelect = (item: any) => {
    if (type === "user") {
      // Use Snowflake ID (18 digits) for user mentions
      const snowflakeId = uuidToSnowflake(item.id);
      onSelect(`<@${snowflakeId}>`, item.displayName);
    } else if (type === "role") {
      if (item.id === "everyone" || item.id === "here") {
        onSelect(`@${item.name}`, `@${item.name}`);
      } else {
        // Use Snowflake ID for role mentions
        const snowflakeId = uuidToSnowflake(item.id);
        onSelect(`<@&${snowflakeId}>`, `@${item.name}`);
      }
    } else if (type === "channel") {
      // Use Snowflake ID for channel mentions
      const snowflakeId = uuidToSnowflake(item.id);
      // Format channel name based on type (kebab-case for text, exact for voice)
      const formattedName = formatChannelName(item.name, item.type);
      onSelect(`<#${snowflakeId}>`, `#${formattedName}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-[#272e4e] border border-border rounded-lg shadow-lg overflow-hidden z-50"
    >
      <ScrollArea className="max-h-[200px]">
        <div className="p-1">
          {type === "user" && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Membres</div>
              {(suggestions as MentionMember[]).map((member, index) => (
                <button
                  key={member.id}
                  data-mention-item
                  onClick={() => handleSelect(member)}
                  onMouseEnter={() => onIndexChange(index)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    index === selectedIndex ? "bg-[#5865f2] text-white" : "hover:bg-muted",
                  )}
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {member.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.displayName}</span>
                  <span className="text-muted-foreground">{member.username.toLowerCase()}</span>
                </button>
              ))}
            </>
          )}

          {type === "role" && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Rôles</div>
              {(suggestions as MentionRole[]).map((role, index) => (
                <button
                  key={role.id}
                  data-mention-item
                  onClick={() => handleSelect(role)}
                  onMouseEnter={() => onIndexChange(index)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    index === selectedIndex ? "bg-[#5865f2] text-white" : "hover:bg-muted",
                  )}
                >
                  <AtSign className="w-4 h-4" style={{ color: role.color || "#99aab5" }} />
                  <span style={{ color: index === selectedIndex ? "white" : role.color || "#99aab5" }}>
                    {role.name}
                  </span>
                </button>
              ))}
            </>
          )}

          {type === "channel" && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Salons</div>
              {(suggestions as MentionChannel[]).map((channel, index) => (
                <button
                  key={channel.id}
                  data-mention-item
                  onClick={() => handleSelect(channel)}
                  onMouseEnter={() => onIndexChange(index)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                    index === selectedIndex ? "bg-[#5865f2] text-white" : "hover:bg-muted",
                  )}
                >
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span>{channel.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
