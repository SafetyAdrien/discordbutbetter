import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Hash, BookOpen, Search, List, MessageSquare } from 'lucide-react';
import { RoleInfoPopup } from '@/components/profile/RoleInfoPopup';

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
        className="inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
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
              inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
              transition-colors duration-100
              ${isSelf 
                ? 'bg-[rgba(250,166,26,0.3)] text-[#faa61a] border-l-2 border-[#faa61a] hover:bg-[rgba(250,166,26,0.5)]' 
                : 'bg-primary/30 text-[#dee0fc] hover:bg-primary hover:text-white'
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

export function RoleMention({ roleId, roleName, roleColor, serverId }: RoleMentionProps) {
  const pill = (
    <span
      role="button"
      tabIndex={0}
      className="inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium transition-colors duration-100 bg-primary/30 text-[#dee0fc] hover:bg-primary hover:text-white"
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
              style={{ backgroundColor: roleColor || '#99aab5' }}
            />
            <div>
              <p className="font-semibold" style={{ color: roleColor || '#99aab5' }}>{roleName}</p>
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
      className="inline-flex items-center gap-0.5 px-1 rounded-[3px] cursor-pointer font-medium
        bg-[rgba(79,84,92,0.48)] text-[#c4c9ce] hover:bg-[rgba(79,84,92,0.76)] hover:text-white
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
    <span className="inline-flex items-center gap-1 px-1 rounded-[3px] cursor-pointer font-medium
      bg-[rgba(79,84,92,0.48)] text-[#c4c9ce] hover:bg-[rgba(79,84,92,0.76)] hover:text-white
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
      className="inline-flex items-center px-1 rounded-[3px] font-medium bg-primary/30 text-[#dee0fc] hover:bg-primary hover:text-white transition-colors duration-100 cursor-pointer align-baseline"
    >
      @{type}
    </button>
  );

  if (!serverId) return trigger;

  // Lazy import to avoid circular deps at module init
  const { EveryoneHerePopup } = require('@/components/profile/EveryoneHerePopup');
  return (
    <EveryoneHerePopup type={type} serverId={serverId}>
      {trigger}
    </EveryoneHerePopup>
  );
}
