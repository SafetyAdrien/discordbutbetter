import React from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { 
  UserMention, 
  RoleMention, 
  ChannelMention, 
  SpecialMention, 
  MessageLinkEmbed,
  EveryoneMention 
} from '@/components/chat/mentions/MentionComponents';

// ============================================
// TYPES
// ============================================
interface MarkdownToken {
  type: 
    | 'text' | 'bold' | 'italic' | 'underline' | 'strikethrough' 
    | 'code' | 'spoiler' | 'boldItalic' | 'underlineBold' 
    | 'underlineItalic' | 'underlineBoldItalic' | 'link' | 'codeBlock'
    | 'userMention' | 'roleMention' | 'channelMention' | 'specialMention'
    | 'everyoneMention' | 'messageLinkEmbed';
  content: string | MarkdownToken[];
  url?: string;
  language?: string;
  // Mention-specific data
  mentionId?: string;
  mentionType?: 'guide' | 'browse' | 'customize' | 'everyone' | 'here';
  // Message link embed data
  embedData?: {
    serverId: string;
    channelId: string;
    messageId: string;
  };
}

interface BlockToken {
  type: 'paragraph' | 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'multiBlockquote' | 'listItem' | 'orderedListItem' | 'codeBlock' | 'empty';
  content: string;
  language?: string;
  indentLevel?: number;
}

// Context for providing user/role/channel data
export interface MarkdownContext {
  currentUserId?: string;
  users?: Map<string, { displayName: string; avatarUrl?: string }>;
  roles?: Map<string, { name: string; color: string }>;
  channels?: Map<string, { name: string; serverId?: string }>;
  onUserClick?: (userId: string) => void;
  onChannelNavigate?: (channelId: string) => void;
  onMessageJump?: (serverId: string, channelId: string, messageId: string) => void;
}

// Default context
let markdownContext: MarkdownContext = {};

export function setMarkdownContext(ctx: MarkdownContext) {
  markdownContext = ctx;
}

// ============================================
// INLINE PATTERNS
// ============================================
const INLINE_PATTERNS: { regex: RegExp; type: MarkdownToken['type'] }[] = [
  // Order matters - more specific patterns first
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

// ============================================
// MENTION PATTERNS
// ============================================
const MENTION_PATTERNS = {
  user: /<@!?([0-9a-f-]+)>/gi,
  role: /<@&([0-9a-f-]+)>/gi,
  channel: /<#([0-9a-f-]+)>/gi,
  special: /<id:(guide|browse|customize)>/gi,
  everyone: /@(everyone|here)/gi,
  messageLink: /https?:\/\/(?:discord\.com|discordapp\.com)\/channels\/([0-9a-f-]+)\/([0-9a-f-]+)\/([0-9a-f-]+)/gi,
};

// ============================================
// TOKENIZE INLINE CONTENT
// ============================================
function tokenizeInline(text: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  
  // Handle escape characters first
  let processedText = text.replace(/\\([*_~|`#\->\[\]\\<@])/g, '___ESC_$1___');
  let remaining = processedText;
  
  while (remaining.length > 0) {
    let earliestMatch: { 
      index: number; 
      length: number; 
      content: string; 
      type: MarkdownToken['type']; 
      url?: string;
      mentionId?: string;
      mentionType?: 'guide' | 'browse' | 'customize' | 'everyone' | 'here';
      embedData?: { serverId: string; channelId: string; messageId: string };
    } | null = null;
    
    // Check for message link embed (highest priority for URLs)
    MENTION_PATTERNS.messageLink.lastIndex = 0;
    const msgLinkMatch = MENTION_PATTERNS.messageLink.exec(remaining);
    if (msgLinkMatch && (earliestMatch === null || msgLinkMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: msgLinkMatch.index,
        length: msgLinkMatch[0].length,
        content: '',
        type: 'messageLinkEmbed',
        embedData: {
          serverId: msgLinkMatch[1],
          channelId: msgLinkMatch[2],
          messageId: msgLinkMatch[3],
        },
      };
    }

    // Check for user mentions <@USER_ID> or <@!USER_ID>
    MENTION_PATTERNS.user.lastIndex = 0;
    const userMatch = MENTION_PATTERNS.user.exec(remaining);
    if (userMatch && (earliestMatch === null || userMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: userMatch.index,
        length: userMatch[0].length,
        content: userMatch[1],
        type: 'userMention',
        mentionId: userMatch[1],
      };
    }

    // Check for role mentions <@&ROLE_ID>
    MENTION_PATTERNS.role.lastIndex = 0;
    const roleMatch = MENTION_PATTERNS.role.exec(remaining);
    if (roleMatch && (earliestMatch === null || roleMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: roleMatch.index,
        length: roleMatch[0].length,
        content: roleMatch[1],
        type: 'roleMention',
        mentionId: roleMatch[1],
      };
    }

    // Check for channel mentions <#CHANNEL_ID>
    MENTION_PATTERNS.channel.lastIndex = 0;
    const channelMatch = MENTION_PATTERNS.channel.exec(remaining);
    if (channelMatch && (earliestMatch === null || channelMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: channelMatch.index,
        length: channelMatch[0].length,
        content: channelMatch[1],
        type: 'channelMention',
        mentionId: channelMatch[1],
      };
    }

    // Check for special mentions <id:guide>, <id:browse>, <id:customize>
    MENTION_PATTERNS.special.lastIndex = 0;
    const specialMatch = MENTION_PATTERNS.special.exec(remaining);
    if (specialMatch && (earliestMatch === null || specialMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: specialMatch.index,
        length: specialMatch[0].length,
        content: specialMatch[1],
        type: 'specialMention',
        mentionType: specialMatch[1] as 'guide' | 'browse' | 'customize',
      };
    }

    // Check for @everyone and @here
    MENTION_PATTERNS.everyone.lastIndex = 0;
    const everyoneMatch = MENTION_PATTERNS.everyone.exec(remaining);
    if (everyoneMatch && (earliestMatch === null || everyoneMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: everyoneMatch.index,
        length: everyoneMatch[0].length,
        content: everyoneMatch[1],
        type: 'everyoneMention',
        mentionType: everyoneMatch[1].toLowerCase() as 'everyone' | 'here',
      };
    }

    // Check for masked links [text](url)
    const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);
    if (linkMatch && (earliestMatch === null || linkMatch.index < earliestMatch.index)) {
      earliestMatch = {
        index: linkMatch.index,
        length: linkMatch[0].length,
        content: linkMatch[1],
        type: 'link',
        url: linkMatch[2],
      };
    }
    
    // Check for inline patterns (bold, italic, etc.)
    for (const { regex, type } of INLINE_PATTERNS) {
      regex.lastIndex = 0;
      const match = regex.exec(remaining);
      if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
        earliestMatch = {
          index: match.index,
          length: match[0].length,
          content: match[1],
          type,
        };
      }
    }
    
    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        tokens.push({ type: 'text', content: remaining.slice(0, earliestMatch.index) });
      }
      
      // Add the matched token
      if (earliestMatch.type === 'link') {
        tokens.push({
          type: 'link',
          content: earliestMatch.content,
          url: earliestMatch.url,
        });
      } else if (earliestMatch.type === 'code') {
        tokens.push({
          type: earliestMatch.type,
          content: earliestMatch.content,
        });
      } else if (earliestMatch.type === 'userMention') {
        tokens.push({
          type: 'userMention',
          content: earliestMatch.content,
          mentionId: earliestMatch.mentionId,
        });
      } else if (earliestMatch.type === 'roleMention') {
        tokens.push({
          type: 'roleMention',
          content: earliestMatch.content,
          mentionId: earliestMatch.mentionId,
        });
      } else if (earliestMatch.type === 'channelMention') {
        tokens.push({
          type: 'channelMention',
          content: earliestMatch.content,
          mentionId: earliestMatch.mentionId,
        });
      } else if (earliestMatch.type === 'specialMention') {
        tokens.push({
          type: 'specialMention',
          content: earliestMatch.content,
          mentionType: earliestMatch.mentionType,
        });
      } else if (earliestMatch.type === 'everyoneMention') {
        tokens.push({
          type: 'everyoneMention',
          content: earliestMatch.content,
          mentionType: earliestMatch.mentionType,
        });
      } else if (earliestMatch.type === 'messageLinkEmbed') {
        tokens.push({
          type: 'messageLinkEmbed',
          content: '',
          embedData: earliestMatch.embedData,
        });
      } else {
        // Recursively parse content for other types
        const innerTokens = tokenizeInline(earliestMatch.content);
        tokens.push({
          type: earliestMatch.type,
          content: innerTokens.length === 1 && innerTokens[0].type === 'text' 
            ? (innerTokens[0].content as string)
            : innerTokens,
        });
      }
      
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      // No more matches, add remaining text
      tokens.push({ type: 'text', content: remaining });
      break;
    }
  }
  
  return tokens;
}

// ============================================
// PARSE BLOCK-LEVEL ELEMENTS
// ============================================
function parseBlocks(content: string): BlockToken[] {
  const blocks: BlockToken[] = [];
  
  // Handle multi-line code blocks
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  
  const segments: { type: 'text' | 'codeBlock'; content: string; language?: string }[] = [];
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'codeBlock', content: match[2], language: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  // Process each segment
  for (const segment of segments) {
    if (segment.type === 'codeBlock') {
      blocks.push({ type: 'codeBlock', content: segment.content, language: segment.language });
      continue;
    }
    
    // Check for multi-line blockquote (>>> at start)
    if (segment.content.startsWith('>>> ')) {
      blocks.push({ type: 'multiBlockquote', content: segment.content.slice(4) });
      continue;
    }
    
    // Process line by line for other block elements
    const lines = segment.content.split('\n');
    
    for (const line of lines) {
      if (line.trim() === '') {
        blocks.push({ type: 'empty', content: '' });
        continue;
      }
      
      // Header patterns
      if (line.startsWith('### ')) {
        blocks.push({ type: 'header3', content: line.slice(4) });
      } else if (line.startsWith('## ')) {
        blocks.push({ type: 'header2', content: line.slice(3) });
      } else if (line.startsWith('# ')) {
        blocks.push({ type: 'header1', content: line.slice(2) });
      }
      // Subtext pattern
      else if (line.startsWith('-# ')) {
        blocks.push({ type: 'subtext', content: line.slice(3) });
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        blocks.push({ type: 'blockquote', content: line.slice(2) });
      }
      // Unordered list (with indentation support)
      else if (/^(\s*)[-*] /.test(line)) {
        const listMatch = line.match(/^(\s*)[-*] /);
        const indentLevel = listMatch ? Math.floor(listMatch[1].length / 2) : 0;
        blocks.push({ type: 'listItem', content: line.slice(listMatch![0].length), indentLevel });
      }
      // Ordered list (with indentation support)
      else if (/^(\s*)\d+\. /.test(line)) {
        const listMatch = line.match(/^(\s*)\d+\. /);
        const indentLevel = listMatch ? Math.floor(listMatch[1].length / 2) : 0;
        blocks.push({ type: 'orderedListItem', content: line.slice(listMatch![0].length), indentLevel });
      }
      // Regular paragraph
      else {
        blocks.push({ type: 'paragraph', content: line });
      }
    }
  }
  
  return blocks;
}

// ============================================
// RENDER INLINE TOKEN
// ============================================
function renderInlineToken(token: MarkdownToken, key: number): React.ReactNode {
  const renderContent = (content: string | MarkdownToken[]): React.ReactNode => {
    if (typeof content === 'string') return content;
    return content.map((t, i) => renderInlineToken(t, i));
  };

  switch (token.type) {
    case 'text':
      // Restore escaped characters
      const textContent = (token.content as string).replace(/___ESC_(.+?)___/g, '$1');
      return <React.Fragment key={key}>{textContent}</React.Fragment>;
    
    case 'bold':
      return <strong key={key}>{renderContent(token.content)}</strong>;
    
    case 'italic':
      return <em key={key}>{renderContent(token.content)}</em>;
    
    case 'underline':
      return <u key={key}>{renderContent(token.content)}</u>;
    
    case 'boldItalic':
      return <strong key={key}><em>{renderContent(token.content)}</em></strong>;
    
    case 'underlineBold':
      return <u key={key}><strong>{renderContent(token.content)}</strong></u>;
    
    case 'underlineItalic':
      return <u key={key}><em>{renderContent(token.content)}</em></u>;
    
    case 'underlineBoldItalic':
      return <u key={key}><strong><em>{renderContent(token.content)}</em></strong></u>;
    
    case 'strikethrough':
      return <del key={key} className="text-muted-foreground">{renderContent(token.content)}</del>;
    
    case 'code':
      return (
        <code key={key} className="px-1.5 py-0.5 bg-[#2b2d31] rounded text-sm font-mono text-[#d4d7dc]">
          {token.content as string}
        </code>
      );
    
    case 'spoiler':
      return (
        <span 
          key={key} 
          className="spoiler"
          onClick={(e) => e.currentTarget.classList.toggle('revealed')}
        >
          {renderContent(token.content)}
        </span>
      );
    
    case 'link':
      return (
        <a 
          key={key} 
          href={token.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#00a8fc] hover:underline"
        >
          {token.content as string}
        </a>
      );

    // ============================================
    // MENTION RENDERS
    // ============================================
    case 'userMention': {
      const userId = token.mentionId || (token.content as string);
      const userData = markdownContext.users?.get(userId);
      const isSelf = markdownContext.currentUserId === userId;
      
      return (
        <UserMention
          key={key}
          userId={userId}
          displayName={userData?.displayName || 'Utilisateur inconnu'}
          avatarUrl={userData?.avatarUrl}
          isSelf={isSelf}
          onClick={() => markdownContext.onUserClick?.(userId)}
        />
      );
    }

    case 'roleMention': {
      const roleId = token.mentionId || (token.content as string);
      const roleData = markdownContext.roles?.get(roleId);
      
      return (
        <RoleMention
          key={key}
          roleId={roleId}
          roleName={roleData?.name || 'Rôle inconnu'}
          roleColor={roleData?.color || '#99aab5'}
        />
      );
    }

    case 'channelMention': {
      const channelId = token.mentionId || (token.content as string);
      const channelData = markdownContext.channels?.get(channelId);
      
      return (
        <ChannelMention
          key={key}
          channelId={channelId}
          channelName={channelData?.name || 'salon-inconnu'}
          serverId={channelData?.serverId}
          onNavigate={markdownContext.onChannelNavigate}
        />
      );
    }

    case 'specialMention':
      return (
        <SpecialMention
          key={key}
          type={token.mentionType as 'guide' | 'browse' | 'customize'}
        />
      );

    case 'everyoneMention':
      return (
        <EveryoneMention
          key={key}
          type={token.mentionType as 'everyone' | 'here'}
        />
      );

    case 'messageLinkEmbed': {
      const embed = token.embedData;
      if (!embed) return null;
      
      return (
        <MessageLinkEmbed
          key={key}
          serverId={embed.serverId}
          channelId={embed.channelId}
          messageId={embed.messageId}
          onJump={() => markdownContext.onMessageJump?.(embed.serverId, embed.channelId, embed.messageId)}
        />
      );
    }
    
    default:
      return <React.Fragment key={key}>{renderContent(token.content)}</React.Fragment>;
  }
}

// ============================================
// RENDER BLOCK TOKEN
// ============================================
function renderBlockToken(block: BlockToken, key: number): React.ReactNode {
  const renderInlineContent = (content: string): React.ReactNode => {
    const tokens = tokenizeInline(content);
    return tokens.map((token, i) => renderInlineToken(token, i));
  };

  switch (block.type) {
    case 'header1':
      return (
        <h1 key={key} className="text-2xl font-bold text-white my-2">
          {renderInlineContent(block.content)}
        </h1>
      );
    case 'header2':
      return (
        <h2 key={key} className="text-xl font-bold text-white my-1.5">
          {renderInlineContent(block.content)}
        </h2>
      );
    case 'header3':
      return (
        <h3 key={key} className="text-lg font-semibold text-white my-1">
          {renderInlineContent(block.content)}
        </h3>
      );
    case 'subtext':
      return (
        <p key={key} className="text-[12px] text-[#949BA4] leading-4">
          {renderInlineContent(block.content)}
        </p>
      );
    case 'blockquote':
      return (
        <blockquote key={key} className="border-l-[4px] border-[#4e5058] pl-3 my-1 text-muted-foreground">
          {renderInlineContent(block.content)}
        </blockquote>
      );
    case 'multiBlockquote':
      return (
        <blockquote key={key} className="border-l-[4px] border-[#4e5058] pl-3 my-1 text-muted-foreground whitespace-pre-wrap">
          {renderInlineContent(block.content)}
        </blockquote>
      );
    case 'listItem': {
      const ulIndent = (block.indentLevel || 0) * 4 + 4;
      return (
        <li key={key} className="list-disc" style={{ marginLeft: `${ulIndent * 4}px` }}>
          {renderInlineContent(block.content)}
        </li>
      );
    }
    case 'orderedListItem': {
      const olIndent = (block.indentLevel || 0) * 4 + 4;
      return (
        <li key={key} className="list-decimal" style={{ marginLeft: `${olIndent * 4}px` }}>
          {renderInlineContent(block.content)}
        </li>
      );
    }
    case 'codeBlock':
      return <CodeBlock key={key} code={block.content} language={block.language} />;
    case 'empty':
      return <br key={key} />;
    case 'paragraph':
    default:
      return (
        <span key={key}>
          {renderInlineContent(block.content)}
        </span>
      );
  }
}

// ============================================
// MAIN PARSE FUNCTION
// ============================================
export function parseMarkdown(content: string): React.ReactNode {
  // Check if content has any block-level elements
  const hasBlockElements = /^(#{1,3} |-# |> |>>> |\d+\. |[-*] |```)/.test(content) || content.includes('```');
  
  if (!hasBlockElements) {
    // Simple inline-only parsing with line break support
    const lines = content.split('\n');
    return lines.map((line, i) => (
      <React.Fragment key={i}>
        {tokenizeInline(line).map((token, j) => renderInlineToken(token, j))}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  }
  
  // Full block + inline parsing
  const blocks = parseBlocks(content);
  
  // Group consecutive list items
  const groupedBlocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: BlockToken[] } | null = null;
  
  blocks.forEach((block, index) => {
    if (block.type === 'listItem') {
      if (currentList?.type === 'ul') {
        currentList.items.push(block);
      } else {
        if (currentList) {
          groupedBlocks.push(
            <ol key={`list-${groupedBlocks.length}`} className="my-1">
              {currentList.items.map((item, i) => renderBlockToken(item, i))}
            </ol>
          );
        }
        currentList = { type: 'ul', items: [block] };
      }
    } else if (block.type === 'orderedListItem') {
      if (currentList?.type === 'ol') {
        currentList.items.push(block);
      } else {
        if (currentList) {
          groupedBlocks.push(
            <ul key={`list-${groupedBlocks.length}`} className="my-1">
              {currentList.items.map((item, i) => renderBlockToken(item, i))}
            </ul>
          );
        }
        currentList = { type: 'ol', items: [block] };
      }
    } else {
      if (currentList) {
        const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
        groupedBlocks.push(
          <ListTag key={`list-${groupedBlocks.length}`} className="my-1">
            {currentList.items.map((item, i) => renderBlockToken(item, i))}
          </ListTag>
        );
        currentList = null;
      }
      groupedBlocks.push(renderBlockToken(block, index));
    }
  });
  
  // Flush remaining list
  if (currentList) {
    const ListTag = currentList.type === 'ul' ? 'ul' : 'ol';
    groupedBlocks.push(
      <ListTag key={`list-${groupedBlocks.length}`} className="my-1">
        {currentList.items.map((item, i) => renderBlockToken(item, i))}
      </ListTag>
    );
  }
  
  return <div className="markdown-content text-[#dbdee1]">{groupedBlocks}</div>;
}

// ============================================
// MARKDOWN TEXT COMPONENT (forwardRef)
// ============================================
export const MarkdownText = React.forwardRef<HTMLSpanElement, { content: string; className?: string }>(
  ({ content, className }, ref) => {
    return <span ref={ref} className={className}>{parseMarkdown(content)}</span>;
  }
);
MarkdownText.displayName = 'MarkdownText';
