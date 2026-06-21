import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Hash, BookOpen, Search, List, MessageSquare } from 'lucide-react';
import { RoleInfoPopup } from '@/components/profile/RoleInfoPopup';
import { EveryoneHerePopup } from '@/components/profile/EveryoneHerePopup';

// ============================================
// USER MENTION COMPONENT
// ============================================
interface UserMentionProps {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  variant?: 'chat' | 'bio';
  isSelf?: boolean;
  onClick?: () => void;
}

export function UserMention({ userId, displayName, avatarUrl, isSelf, onClick, variant = 'chat' }: UserMentionProps) {
  if (variant === 'bio') {
    return (
      <span
        onClick={onClick}
        className="mention-pill inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
          bg-[rgba(88,101,242,0.3)] text-[#5865F2] hover:bg-[rgba(88,101,242,0.5)] hover:underline
          transition-colors duration-100"
      >
        @{displayName}
      </span>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            onClick={onClick}
            className={`
              mention-pill inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
              transition-colors duration-100
                ${isSelf
                  ? 'bg-[rgba(88,101,242,0.3)] text-[#5865F2] border-l-2 border-[#5865F2] hover:bg-[rgba(88,101,242,0.5)] hover:text-white max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]'
                  : 'bg-[rgba(88,101,242,0.15)] text-[#5865F2] hover:bg-[rgba(88,101,242,0.3)] hover:text-white max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]'
                }
            `}
          >
            @{displayName}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border-border p-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="bg-primary text-xs">{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-white">{displayName}</p>
              <p className="text-xs text-muted-foreground">Cliquer pour voir le profil</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// ROLE MENTION COMPONENT
// ============================================
interface RoleMentionProps {
  roleId: string;
  roleName: string;
  roleColor: string;
  serverId?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h) || h.toLowerCase() === '000000') {
    return `rgba(88,101,242,${alpha})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function resolveMentionColor(roleColor: string): string {
  const h = (roleColor || '').trim();
  if (!h || h.toLowerCase() === '#000000' || h.toLowerCase() === '#99aab5') return '#5865F2';
  return h;
}

export function RoleMention({ roleId, roleName, roleColor, serverId }: RoleMentionProps) {
  const color = resolveMentionColor(roleColor);
  const bgRest = hexToRgba(color, 0.1);
  const bgHover = hexToRgba(color, 0.3);

  const pill = (
    <span
      role="button"
      tabIndex={0}
      style={
        {
          color,
          backgroundColor: bgRest,
          ['--mention-bg-hover' as any]: bgHover,
        } as React.CSSProperties
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = bgHover;
        e.currentTarget.style.color = '#ffffff';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bgRest;
        e.currentTarget.style.color = color;
      }}
      className="mention-pill inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium transition-colors duration-100 max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]"
    >
      @{roleName}
    </span>
  );

  if (serverId) {
    return (
      <RoleInfoPopup roleId={roleId} serverId={serverId}>
        {pill}
      </RoleInfoPopup>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border-border p-2">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div>
              <p className="font-semibold" style={{ color }}>{roleName}</p>
              <p className="text-xs text-muted-foreground">Rôle du serveur</p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// CHANNEL MENTION COMPONENT
// ============================================
interface ChannelMentionProps {
  channelId: string;
  channelName: string;
  serverId?: string;
  onNavigate?: (channelId: string, serverId?: string) => void;
}

export function ChannelMention({ channelId, channelName, serverId, onNavigate }: ChannelMentionProps) {
  return (
    <span
      onClick={() => onNavigate?.(channelId, serverId)}
      className="mention-pill inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
        bg-primary/30 text-[#dee0fc] hover:bg-primary hover:text-white max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]
        transition-colors duration-100"
    >
      <Hash className="w-3.5 h-3.5" />
      {channelName}
    </span>
  );
}

// ============================================
// SPECIAL MENTION COMPONENTS
// ============================================
interface SpecialMentionProps {
  type: 'guide' | 'browse' | 'customize';
}

const SPECIAL_CONFIGS = {
  guide: { label: 'Guide du serveur', icon: BookOpen },
  browse: { label: 'Chercher des salons', icon: Search },
  customize: { label: 'Salons et rôles', icon: List },
};

export function SpecialMention({ type }: SpecialMentionProps) {
  const config = SPECIAL_CONFIGS[type];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className="mention-pill inline-flex items-center gap-1 px-1 rounded-[3px] cursor-pointer font-medium
      bg-[rgba(79,84,92,0.48)] text-[#c4c9ce] hover:bg-[rgba(79,84,92,0.76)] hover:text-white max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]
      transition-colors duration-100">
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

// ============================================
// MESSAGE LINK EMBED COMPONENT
// ============================================
interface MessageLinkEmbedProps {
  serverId: string;
  channelId: string;
  messageId: string;
  serverName?: string;
  channelName?: string;
  authorName?: string;
  authorAvatar?: string;
  contentPreview?: string;
  onJump?: () => void;
}

export function MessageLinkEmbed({
  serverId,
  channelId,
  messageId,
  serverName = 'Serveur',
  channelName = 'salon',
  authorName = 'Utilisateur',
  authorAvatar,
  contentPreview = 'Message...',
  onJump,
}: MessageLinkEmbedProps) {
  return (
    <div 
      onClick={onJump}
      className="mt-2 p-3 bg-card border border-border rounded-lg cursor-pointer hover:bg-surface-hover transition-colors max-w-md"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={authorAvatar} />
          <AvatarFallback className="bg-primary text-xs">{authorName[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span className="font-medium text-white">{authorName}</span>
            <span>•</span>
            <span>{serverName}</span>
            <span>•</span>
            <Hash className="w-3 h-3" />
            <span>{channelName}</span>
          </div>
          <p className="text-sm text-foreground line-clamp-2">{contentPreview}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 text-xs text-primary">
        <MessageSquare className="w-3 h-3" />
        <span>Aller au message</span>
      </div>
    </div>
  );
}

// ============================================
// EVERYONE / HERE MENTIONS
// ============================================
interface EveryoneMentionProps {
  type: 'everyone' | 'here';
  serverId?: string;
}

export function EveryoneMention({ type, serverId }: EveryoneMentionProps) {
  const trigger = (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="mention-pill inline-flex items-center px-1 rounded-[3px] font-medium bg-primary/30 text-[#dee0fc] hover:bg-primary hover:text-white transition-colors duration-100 cursor-pointer align-baseline max-sm:!min-h-0 max-sm:py-0 max-sm:px-0.5 max-sm:leading-[1rem]"
    >
      @{type}
    </button>
  );

  if (!serverId) return trigger;

  return (
    <EveryoneHerePopup type={type} serverId={serverId}>
      {trigger}
    </EveryoneHerePopup>
  );
}
