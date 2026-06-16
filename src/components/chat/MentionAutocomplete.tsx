import { useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AtSign } from "lucide-react";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineVoice } from "@/components/icons/StreamlineVoice";
import { StreamlineForum } from "@/components/icons/StreamlineForum";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { StreamlineMedia } from "@/components/icons/StreamlineMedia";
import { StreamlineCalendar } from "@/components/icons/StreamlineCalendar";
import { StreamlineTasks } from "@/components/icons/StreamlineTasks";
import { StreamlineStage } from "@/components/icons/StreamlineStage";
import { StreamlineLink } from "@/components/icons/StreamlineLink";
import { cn, normalizeForSearch, formatChannelName } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { uuidToSnowflake } from "@/lib/snowflake";

const channelTypeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
  link: StreamlineLink,
};

function getChannelIcon(type: string): React.ComponentType<{ className?: string }> {
  return channelTypeIconMap[type] || StreamlineHash;
}

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
  type: "user" | "channel";
  query: string;
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
  onSelect: (mention: string, displayText: string) => void;
  onClose: () => void;
  selectedIndex: number;
  onIndexChange: (index: number) => void;
  canMentionEveryone?: boolean;
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
  canMentionEveryone = true,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.toLowerCase();

  // Unified mention: members + (special globals + roles)
  const filteredMembers =
    type === "user"
      ? members
          .filter((m) => m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
          .slice(0, 10)
      : [];

  const specialRoles: MentionRole[] =
    type === "user" && canMentionEveryone
      ? [
          { id: "everyone", name: "everyone", color: "#5865f2" },
          { id: "here", name: "here", color: "#5865f2" },
        ].filter((r) => r.name.includes(q))
      : [];

  const filteredRoles =
    type === "user" ? roles.filter((r) => r.name.toLowerCase().includes(q)).slice(0, 8) : [];

  const rolesAndGlobal: MentionRole[] = [...specialRoles, ...filteredRoles];

  const filteredChannels =
    type === "channel"
      ? (() => {
          const normalizedQuery = normalizeForSearch(query);
          return channels.filter((c) => normalizeForSearch(c.name).includes(normalizedQuery)).slice(0, 10);
        })()
      : [];

  const totalCount =
    type === "user" ? filteredMembers.length + rolesAndGlobal.length : filteredChannels.length;

  // Scroll selected item into view
  useEffect(() => {
    const container = containerRef.current;
    if (container && selectedIndex >= 0) {
      const items = container.querySelectorAll("[data-mention-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (totalCount === 0) return null;

  const handleSelectMember = (member: MentionMember) => {
    const snowflakeId = uuidToSnowflake(member.id);
    onSelect(`<@${snowflakeId}>`, member.displayName);
  };

  const handleSelectRole = (role: MentionRole) => {
    if (role.id === "everyone" || role.id === "here") {
      onSelect(`@${role.name}`, `@${role.name}`);
    } else {
      const snowflakeId = uuidToSnowflake(role.id);
      onSelect(`<@&${snowflakeId}>`, `@${role.name}`);
    }
  };

  const handleSelectChannel = (channel: MentionChannel) => {
    const snowflakeId = uuidToSnowflake(channel.id);
    const formattedName = formatChannelName(channel.name, channel.type);
    onSelect(`<#${snowflakeId}>`, `#${formattedName}`);
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 bg-[#272e4e] border border-border rounded-lg shadow-lg overflow-hidden z-50"
    >
      <ScrollArea className="max-h-[280px]">
        <div className="p-1">
          {type === "user" && (
            <>
              {filteredMembers.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Membres
                  </div>
                  {filteredMembers.map((member, index) => (
                    <button
                      type="button"
                      key={member.id}
                      data-mention-item
                      onClick={() => handleSelectMember(member)}
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

              {filteredMembers.length > 0 && rolesAndGlobal.length > 0 && (
                <Separator className="my-1" />
              )}

              {rolesAndGlobal.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Rôles & Mentions globales
                  </div>
                  {rolesAndGlobal.map((role, idx) => {
                    const globalIndex = filteredMembers.length + idx;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        data-mention-item
                        onClick={() => handleSelectRole(role)}
                        onMouseEnter={() => onIndexChange(globalIndex)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                          globalIndex === selectedIndex ? "bg-[#5865f2] text-white" : "hover:bg-muted",
                        )}
                      >
                        <AtSign className="w-4 h-4" style={{ color: role.color || "#99aab5" }} />
                        <span style={{ color: globalIndex === selectedIndex ? "white" : role.color || "#99aab5" }}>
                          {role.name}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}

          {type === "channel" && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Salons</div>
              {filteredChannels.map((channel, index) => {
                const ChannelIcon = getChannelIcon(channel.type);
                return (
                  <button
                    type="button"
                    key={channel.id}
                    data-mention-item
                    onClick={() => handleSelectChannel(channel)}
                    onMouseEnter={() => onIndexChange(index)}
                    className={cn(
                      "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm transition-colors",
                      index === selectedIndex ? "bg-[#5865f2] text-white" : "hover:bg-muted",
                    )}
                  >
                    <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                    <span>{channel.name}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
