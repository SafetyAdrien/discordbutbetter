/* @refresh reset */
import React, { createContext, useContext, ReactNode, useSyncExternalStore } from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';
import { 
  UserMention, 
  RoleMention, 
  ChannelMention, 
  SpecialMention, 
  MessageLinkEmbed,
  EveryoneMention 
} from '@/components/chat/mentions/MentionComponents';
import { snowflakeToUuid, isValidSnowflake, uuidToSnowflake } from '@/lib/snowflake';

// ============================================
// TYPES
// ============================================
interface MarkdownToken {
  type: 
    | 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' 
    | 'code' | 'spoiler' | 'boldItalic' | 'underlineBold' 
    | 'underlineItalic' | 'underlineBoldItalic' | 'link' | 'codeBlock'
    | 'userMention' | 'roleMention' | 'channelMention' | 'specialMention'
    | 'everyoneMention' | 'messageLinkEmbed' | 'timestamp' | 'autoLink';
  content: string | MarkdownToken[];
  url?: string;
  language?: string;
  mentionId?: string;
  mentionType?: 'guide' | 'browse' | 'customize' | 'everyone' | 'here';
  timestamp?: number;
  timestampFormat?: string;
  embedData?: {
    serverId: string;
    channelId: string;
    messageId: string;
  };
}

interface BlockToken {
  type: 'paragraph' | 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'multiBlockquote' | 'listItem' | 'orderedListItem' | 'codeBlock' | 'empty' | 'separator' | 'escapedParagraph';
  content: string;
  language?: string;
  indentLevel?: number;
}

export interface MarkdownContext {
  currentUserId?: string;
  serverId?: string;
  users?: Map<string, { displayName: string; avatarUrl?: string }>;
  roles?: Map<string, { name: string; color: string }>;
  channels?: Map<string, { name: string; serverId?: string }>;
  onUserClick?: (userId: string) => void;
  onChannelNavigate?: (channelId: string, serverId?: string) => void;
  onMessageJump?: (serverId: string, channelId: string, messageId: string) => void;
  variant?: 'chat' | 'bio';
}

// ============================================
// CONTEXT
// ============================================
const MarkdownReactContext = createContext<MarkdownContext | null>(null);

export function useMarkdownContext() {
  return useContext(MarkdownReactContext);
}

export function MarkdownProvider({ children, value }: { children: ReactNode; value: MarkdownContext }) {
  return (
    <MarkdownReactContext.Provider value={value}>
      {children}
    </MarkdownReactContext.Provider>
  );
}

// Global store for cases where Provider isn't used (legacy compatibility)
let globalMarkdownContext: MarkdownContext = {};
let globalMarkdownContextVersion = 0;
const globalMarkdownContextListeners = new Set<() => void>();

export function setMarkdownContext(ctx: MarkdownContext) {
  globalMarkdownContext = ctx;
  globalMarkdownContextVersion += 1;
  globalMarkdownContextListeners.forEach((l) => l());
}

export function getMarkdownContext(): MarkdownContext {
  return globalMarkdownContext;
}

function subscribeGlobal(l: () => void) {
  globalMarkdownContextListeners.add(l);
  return () => globalMarkdownContextListeners.delete(l);
}

function getGlobalSnapshot() {
  return globalMarkdownContextVersion;
}

// ============================================
// PARSING LOGIC (TRIMMED FOR BREVITY IN TOOL CALL BUT FULL CONTENT PRESERVED)
// ============================================
const INLINE_PATTERNS: { regex: RegExp; type: MarkdownToken['type'] }[] = [
  { regex: /\*\*\*(.+?)\*\*\*/g, type: 'boldItalic' },
  { regex: /___(.+?)___/g, type: 'underlineBoldItalic' },
  { regex: /__\*\*(.+?)\*\*__/g, type: 'underlineBold' },
  { regex: /\*\*__(.+?)__\*\*/g, type: 'underlineBold' },
  { regex: /__\*(.+?)\*__/g, type: 'underlineItalic' },
  { regex: /\*__(.+?)__\*/g, type: 'underlineItalic' },
  { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
  { regex: /__(.+?)__/g, type: 'underline' },
  { regex: /\*(.+?)\*/g, type: 'italic' },
  { regex: /_(.+?)_/g, type: 'italic' },
  { regex: /~~(.+?)~~/g, type: 'strikethrough' },
  { regex: /`([^`]+)`/g, type: 'code' },
  { regex: /\|\|(.+?)\|\|/g, type: 'spoiler' },
];

const MENTION_PATTERNS = {
  user: /<@!?(\d{18}|[0-9a-f-]+)>/gi,
  role: /<@&(\d{18}|[0-9a-f-]+)>/gi,
  channel: /<#(\d{18}|[0-9a-f-]+)>/gi,
  special: /<id:(guide|browse|customize)>/gi,
  everyone: /@(everyone|here)/gi,
  messageLink: /https?:\/\/(?:discord\.com|discordapp\.com)\/channels\/(\d{18}|[0-9a-f-]+)\/(\d{18}|[0-9a-f-]+)\/(\d{18}|[0-9a-f-]+)/gi,
};

function tokenizeInline(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let processedText = text.replace(/\\([*_~|`#\->\[\]\\<@])/g, '\uE000$1\uE001');
  let remaining = processedText;
  
  while (remaining.length > 0) {
    let earliestMatch: any = null;
    
    MENTION_PATTERNS.messageLink.lastIndex = 0;
    const msgLinkMatch = MENTION_PATTERNS.messageLink.exec(remaining);
    if (msgLinkMatch && (earliestMatch === null || msgLinkMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: msgLinkMatch.index, length: msgLinkMatch[0].length, content: '', type: 'messageLinkEmbed',
        embedData: { serverId: msgLinkMatch[1], channelId: msgLinkMatch[2], messageId: msgLinkMatch[3] },
      };
    }

    MENTION_PATTERNS.user.lastIndex = 0;
    const userMatch = MENTION_PATTERNS.user.exec(remaining);
    if (userMatch && (earliestMatch === null || userMatch.index < earliestMatch.index)) {
      earliestMatch = { index: userMatch.index, length: userMatch[0].length, content: userMatch[1], type: 'userMention', mentionId: userMatch[1] };
    }

    MENTION_PATTERNS.role.lastIndex = 0;
    const roleMatch = MENTION_PATTERNS.role.exec(remaining);
    if (roleMatch && (earliestMatch === null || roleMatch.index < earliestMatch.index)) {
      earliestMatch = { index: roleMatch.index, length: roleMatch[0].length, content: roleMatch[1], type: 'roleMention', mentionId: roleMatch[1] };
    }

    MENTION_PATTERNS.channel.lastIndex = 0;
    const channelMatch = MENTION_PATTERNS.channel.exec(remaining);
    if (channelMatch && (earliestMatch === null || channelMatch.index < earliestMatch.index)) {
      earliestMatch = { index: channelMatch.index, length: channelMatch[0].length, content: channelMatch[1], type: 'channelMention', mentionId: channelMatch[1] };
    }

    MENTION_PATTERNS.special.lastIndex = 0;
    const specialMatch = MENTION_PATTERNS.special.exec(remaining);
    if (specialMatch && (earliestMatch === null || specialMatch.index < earliestMatch.index)) {
      earliestMatch = { index: specialMatch.index, length: specialMatch[0].length, content: specialMatch[1], type: 'specialMention', mentionType: specialMatch[1] };
    }

    MENTION_PATTERNS.everyone.lastIndex = 0;
    const everyoneMatch = MENTION_PATTERNS.everyone.exec(remaining);
    if (everyoneMatch && (earliestMatch === null || everyoneMatch.index < earliestMatch.index)) {
      earliestMatch = { index: everyoneMatch.index, length: everyoneMatch[0].length, content: everyoneMatch[1], type: 'everyoneMention', mentionType: everyoneMatch[1].toLowerCase() };
    }

    const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);
    if (linkMatch && (earliestMatch === null || linkMatch.index < earliestMatch.index)) {
      earliestMatch = { index: linkMatch.index, length: linkMatch[0].length, content: linkMatch[1], type: 'link', url: linkMatch[2] };
    }

    const timestampRegex = /<t:(\d+):([tTdDfFR])>/g;
    timestampRegex.lastIndex = 0;
    const timestampMatch = timestampRegex.exec(remaining);
    if (timestampMatch && (earliestMatch === null || timestampMatch.index < earliestMatch.index)) {
      earliestMatch = { index: timestampMatch.index, length: timestampMatch[0].length, content: timestampMatch[0], type: 'timestamp', timestamp: parseInt(timestampMatch[1], 10), timestampFormat: timestampMatch[2] };
    }
    
    for (const { regex, type } of INLINE_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = { index: match.index, length: match[0].length, content: match[1], type };
      }
    }

    const urlRegex = /(https?:\/\/[^\s<>\])"]+)/g;
    urlRegex.lastIndex = 0;
    const urlMatch = urlRegex.exec(remaining);
    if (urlMatch && (earliestMatch === null || urlMatch.index < earliestMatch.index)) {
      earliestMatch = { index: urlMatch.index, length: urlMatch[0].length, content: urlMatch[1], type: 'autoLink', url: urlMatch[1] };
    }
    
    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        tokens.push({ type: 'text', content: remaining.slice(0, earliestMatch.index) });
      }
      
      if (['link', 'autoLink', 'code', 'userMention', 'roleMention', 'channelMention', 'specialMention', 'everyoneMention', 'messageLinkEmbed', 'timestamp'].includes(earliestMatch.type)) {
        tokens.push({
          type: earliestMatch.type,
          content: earliestMatch.content,
          url: earliestMatch.url,
          mentionId: earliestMatch.mentionId,
          mentionType: earliestMatch.mentionType,
          embedData: earliestMatch.embedData,
          timestamp: earliestMatch.timestamp,
          timestampFormat: earliestMatch.timestampFormat,
        });
      } else {
        const innerTokens = tokenizeInline(earliestMatch.content);
        tokens.push({
          type: earliestMatch.type,
          content: innerTokens.length === 1 && innerTokens[0].type === 'text' ? (innerTokens[0].content as string) : innerTokens,
        });
      }
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      tokens.push({ type: 'text', content: remaining });
      break;
    }
  }
  return tokens;
}

function parseBlocks(content: string): BlockToken[] {
  const blocks: BlockToken[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  const segments: { type: 'text' | 'codeBlock'; content: string; language?: string }[] = [];
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    segments.push({ type: 'codeBlock', content: match[2], language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) segments.push({ type: 'text', content: content.slice(lastIndex) });
  
  for (const segment of segments) {
    if (segment.type === 'codeBlock') {
      blocks.push({ type: 'codeBlock', content: segment.content, language: segment.language });
      continue;
    }
    if (segment.content.startsWith('>>> ')) {
      blocks.push({ type: 'multiBlockquote', content: segment.content.slice(4) });
      continue;
    }
    const lines = segment.content.split('\n');
    for (const line of lines) {
      if (line.trim() === '') { blocks.push({ type: 'empty', content: '' }); continue; }
      if (/^\\/.test(line)) { blocks.push({ type: 'escapedParagraph', content: line.slice(1) }); continue; }
      if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { blocks.push({ type: 'separator', content: '' }); continue; }
      if (line.startsWith('### ')) blocks.push({ type: 'header3', content: line.slice(4) });
      else if (line.startsWith('## ')) blocks.push({ type: 'header2', content: line.slice(3) });
      else if (line.startsWith('# ')) blocks.push({ type: 'header1', content: line.slice(2) });
      else if (line.startsWith('-# ')) blocks.push({ type: 'subtext', content: line.slice(3) });
      else if (line.startsWith('> ')) blocks.push({ type: 'blockquote', content: line.slice(2) });
      else if (/^(\s*)[-*] /.test(line)) {
        const listMatch = line.match(/^(\s*)[-*] /);
        blocks.push({ type: 'listItem', content: line.slice(listMatch![0].length), indentLevel: listMatch![1].length });
      }
      else if (/^(\s*)\d+\. /.test(line)) {
        const listMatch = line.match(/^(\s*)\d+\. /);
        blocks.push({ type: 'orderedListItem', content: line.slice(listMatch![0].length), indentLevel: listMatch![1].length });
      }
      else blocks.push({ type: 'paragraph', content: line });
    }
  }
  return blocks;
}

function renderInlineToken(token: MarkdownToken, key: number, context: MarkdownContext): React.ReactNode {
  const renderContent = (content: string | MarkdownToken[]): React.ReactNode => {
    if (typeof content === 'string') return content;
    return content.map((t, i) => renderInlineToken(t, i, context));
  };

  switch (token.type) {
    case 'text':
      return <React.Fragment key={key}>{(token.content as string).replace(/\uE000(.?)\uE001/g, '$1')}</React.Fragment>;
    case 'bold': return <strong key={key}>{renderContent(token.content)}</strong>;
    case 'italic': return <em key={key}>{renderContent(token.content)}</em>;
    case 'underline': return <u key={key}>{renderContent(token.content)}</u>;
    case 'boldItalic': return <strong key={key}><em>{renderContent(token.content)}</em></strong>;
    case 'underlineBold': return <u key={key}><strong>{renderContent(token.content)}</strong></u>;
    case 'underlineItalic': return <u key={key}><em>{renderContent(token.content)}</em></u>;
    case 'underlineBoldItalic': return <u key={key}><strong><em>{renderContent(token.content)}</em></strong></u>;
    case 'strikethrough': return <del key={key} className="text-muted-foreground">{renderContent(token.content)}</del>;
    case 'code': return <code key={key} className="px-1.5 py-0.5 bg-[hsl(var(--surface-elevated))] rounded text-sm font-mono text-foreground">{token.content as string}</code>;
    case 'spoiler': return <span key={key} className="spoiler" onClick={(e) => e.currentTarget.classList.toggle('revealed')}>{renderContent(token.content)}</span>;
    case 'link': return <a key={key} href={token.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{token.content as string}</a>;
    case 'userMention': {
      const mentionId = token.mentionId || (token.content as string);
      const userId = isValidSnowflake(mentionId) ? (snowflakeToUuid(mentionId) || mentionId) : mentionId;
      const userData = context.users?.get(userId);
      return <UserMention key={key} userId={userId} displayName={userData?.displayName || 'Utilisateur inconnu'} avatarUrl={userData?.avatarUrl} isSelf={context.currentUserId === userId} onClick={() => context.onUserClick?.(userId)} variant={context.variant} />;
    }
    case 'roleMention': {
      const mentionId = token.mentionId || (token.content as string);
      const roleId = isValidSnowflake(mentionId) ? (snowflakeToUuid(mentionId) || [...(context.roles?.keys() ?? [])].find((id) => uuidToSnowflake(id) === mentionId) || mentionId) : mentionId;
      const roleData = context.roles?.get(roleId);
      return <RoleMention key={key} roleId={roleId} roleName={roleData?.name || 'Rôle inconnu'} roleColor={roleData?.color || '#99aab5'} serverId={context.serverId} />;
    }
    case 'channelMention': {
      const mentionId = token.mentionId || (token.content as string);
      const channelId = isValidSnowflake(mentionId) ? (snowflakeToUuid(mentionId) || mentionId) : mentionId;
      const channelData = context.channels?.get(channelId);
      return <ChannelMention key={key} channelId={channelId} channelName={channelData?.name || 'salon-inconnu'} serverId={channelData?.serverId} onNavigate={context.onChannelNavigate} />;
    }
    case 'specialMention': return <SpecialMention key={key} type={token.mentionType as any} />;
    case 'everyoneMention': return <EveryoneMention key={key} type={token.mentionType as any} serverId={context.serverId} />;
    case 'messageLinkEmbed': return token.embedData ? <MessageLinkEmbed key={key} serverId={token.embedData.serverId} channelId={token.embedData.channelId} messageId={token.embedData.messageId} onJump={() => context.onMessageJump?.(token.embedData!.serverId, token.embedData!.channelId, token.embedData!.messageId)} /> : null;
    case 'timestamp': {
      const ts = token.timestamp; if (!ts) return <React.Fragment key={key}>{token.content as string}</React.Fragment>;
      const date = new Date(ts * 1000); const fmt = token.timestampFormat || 'f'; const locale = 'fr-FR'; let formatted: string;
      switch (fmt) {
        case 't': formatted = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); break;
        case 'T': formatted = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); break;
        case 'd': formatted = date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }); break;
        case 'D': formatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }); break;
        case 'f': formatted = date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); break;
        case 'F': formatted = date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }); break;
        case 'R': {
          const diffS = Math.floor((Date.now() - ts * 1000) / 1000);
          if (diffS < 60) formatted = "à l'instant"; else if (diffS < 3600) formatted = `il y a ${Math.floor(diffS / 60)} min`;
          else if (diffS < 86400) formatted = `il y a ${Math.floor(diffS / 3600)}h`; else if (diffS < 2592000) formatted = `il y a ${Math.floor(diffS / 86400)}j`;
          else formatted = date.toLocaleDateString(locale); break;
        }
        default: formatted = date.toLocaleString(locale);
      }
      return <span key={key} className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/15 text-primary text-sm cursor-default" title={date.toLocaleString(locale)}>{formatted}</span>;
    }
    case 'autoLink': return <a key={key} href={token.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{(token.content as string).length > 80 ? (token.content as string).slice(0, 77) + '...' : token.content as string}</a>;
    default: return <React.Fragment key={key}>{renderContent(token.content)}</React.Fragment>;
  }
}

function renderBlockToken(block: BlockToken, key: number, context: MarkdownContext, isLast: boolean = false): React.ReactNode {
  const renderInlineContent = (content: string) => tokenizeInline(content).map((token, i) => renderInlineToken(token, i, context));
  switch (block.type) {
    case 'header1': return <div key={key}><h1 className="text-2xl font-bold text-white my-1">{renderInlineContent(block.content)}</h1><hr className="border-t border-[hsl(228,6%,26%)] mb-2 mt-1" /></div>;
    case 'header2': return <div key={key}><h2 className="text-xl font-bold text-white my-1">{renderInlineContent(block.content)}</h2><hr className="border-t border-[hsl(228,6%,26%)] mb-2 mt-1" /></div>;
    case 'header3': return <div key={key}><h3 className="text-lg font-semibold text-white my-0.5">{renderInlineContent(block.content)}</h3><hr className="border-t border-[hsl(228,6%,26%)] mb-2 mt-1" /></div>;
    case 'subtext': return <div key={key}><hr className="border-t border-[hsl(228,6%,26%)] mt-2 mb-0.5" /><p className="text-[12px] text-muted-foreground leading-4">{renderInlineContent(block.content)}</p></div>;
    case 'blockquote': return <blockquote key={key} className="border-l-[4px] border-border pl-3 my-0.5 text-muted-foreground">{renderInlineContent(block.content)}</blockquote>;
    case 'multiBlockquote': return <blockquote key={key} className="border-l-[4px] border-border pl-3 my-0.5 text-muted-foreground whitespace-pre-wrap">{renderInlineContent(block.content)}</blockquote>;
    case 'listItem': { const level = block.indentLevel || 0; return <li key={key} className={level === 0 ? 'list-disc' : level === 1 ? 'list-[circle]' : 'list-[square]'} style={{ marginLeft: `${(level + 1) * 16}px` }}>{renderInlineContent(block.content)}</li>; }
    case 'orderedListItem': { const level = block.indentLevel || 0; return <li key={key} className="list-decimal" style={{ marginLeft: `${(level + 1) * 16}px` }}>{renderInlineContent(block.content)}</li>; }
    case 'codeBlock': return <CodeBlock key={key} code={block.content} language={block.language} />;
    case 'separator': return <hr key={key} className="border-t border-[hsl(228,6%,26%)] my-1" />;
    case 'empty': return <br key={key} />;
    case 'escapedParagraph': return <React.Fragment key={key}><span>{block.content}</span>{!isLast && <br />}</React.Fragment>;
    case 'paragraph':
    default: return <React.Fragment key={key}><span>{renderInlineContent(block.content)}</span>{!isLast && <br />}</React.Fragment>;
  }
}

export function parseMarkdown(content: string, context: MarkdownContext = globalMarkdownContext): React.ReactNode {
  const hasBlockElements = /^(\\[#>\-*_]|#{1,3} |-# |> |>>> |\d+\. |[-*] |-{3,}|\*{3,}|_{3,})/m.test(content) || content.includes('```');
  if (!hasBlockElements) {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('\\')) return <React.Fragment key={i}>{line.slice(1)}{i < lines.length - 1 && <br />}</React.Fragment>;
      return <React.Fragment key={i}>{tokenizeInline(line).map((token, j) => renderInlineToken(token, j, context))}{i < lines.length - 1 && <br />}</React.Fragment>;
    });
  }
  const blocks = parseBlocks(content);
  const groupedBlocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: BlockToken[] } | null = null;
  blocks.forEach((block, index) => {
    if (block.type === 'listItem' || block.type === 'orderedListItem') {
      const type = block.type === 'listItem' ? 'ul' : 'ol';
      if (currentList?.type === type) currentList.items.push(block);
      else {
        if (currentList) {
          const Tag = currentList.type === 'ul' ? 'ul' : 'ol';
          groupedBlocks.push(<Tag key={`list-${groupedBlocks.length}`} className="my-1">{currentList.items.map((item, i) => renderBlockToken(item, i, context))}</Tag>);
        }
        currentList = { type, items: [block] };
      }
    } else {
      if (currentList) {
        const Tag = currentList.type === 'ul' ? 'ul' : 'ol';
        groupedBlocks.push(<Tag key={`list-${groupedBlocks.length}`} className="my-1">{currentList.items.map((item, i) => renderBlockToken(item, i, context))}</Tag>);
        currentList = null;
      }
      groupedBlocks.push(renderBlockToken(block, index, context, index === blocks.length - 1));
    }
  });
  if (currentList) {
    const Tag = currentList.type === 'ul' ? 'ul' : 'ol';
    groupedBlocks.push(<Tag key={`list-${groupedBlocks.length}`} className="my-1">{currentList.items.map((item, i) => renderBlockToken(item, i, context))}</Tag>);
  }
  return <div className="markdown-content text-foreground">{groupedBlocks}</div>;
}

// ============================================
// MARKDOWN TEXT COMPONENT
// ============================================
export const MarkdownText = React.forwardRef<HTMLDivElement, { content: string; className?: string; variant?: 'chat' | 'bio' }>(
  ({ content, className, variant }, ref) => {
    const reactContext = useMarkdownContext();
    useSyncExternalStore(subscribeGlobal, getGlobalSnapshot);
    const activeContext = reactContext || globalMarkdownContext;
    const ctxWithVariant = variant ? { ...activeContext, variant } : activeContext;
    return <div ref={ref} className={className} style={{ display: 'inline-block', verticalAlign: 'top' }}>{parseMarkdown(content, ctxWithVariant)}</div>;
  }
);
MarkdownText.displayName = 'MarkdownText';
