import { useMemo, forwardRef, ReactNode } from 'react';
import { snowflakeToUuid } from '@/lib/snowflake';
import { MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';

export interface MentionLookupData {
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
}

interface InputMarkdownOverlayProps {
  content: string;
  compact?: boolean;
  className?: string;
  mentionData?: MentionLookupData;
}

interface OverlayLine {
  type: 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'listItem' | 'orderedListItem' | 'codeBlockDelimiter' | 'codeBlockLine' | 'separator' | 'normal';
  text: string;
}

export function parseLines(content: string): OverlayLine[] {
  if (!content) return [{ type: 'normal', text: '' }];

  const lines = content.split('\n');
  const result: OverlayLine[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      result.push({ type: 'codeBlockDelimiter', text: line });
      continue;
    }

    if (inCodeBlock) {
      result.push({ type: 'codeBlockLine', text: line });
      continue;
    }

    if (line.startsWith('### ')) { result.push({ type: 'header3', text: line }); continue; }
    if (line.startsWith('## ')) { result.push({ type: 'header2', text: line }); continue; }
    if (line.startsWith('# ')) { result.push({ type: 'header1', text: line }); continue; }
    if (line.startsWith('-# ')) { result.push({ type: 'subtext', text: line }); continue; }
    if (line.startsWith('> ') || line.startsWith('>>> ')) { result.push({ type: 'blockquote', text: line }); continue; }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { result.push({ type: 'separator', text: line }); continue; }
    if (/^(\s*)[-*] /.test(line)) { result.push({ type: 'listItem', text: line }); continue; }
    if (/^(\s*)\d+\. /.test(line)) { result.push({ type: 'orderedListItem', text: line }); continue; }
    result.push({ type: 'normal', text: line });
  }

  return result;
}

// CRITICAL: No font-weight, font-family, or font-size variation allowed.
// Only color and visual-only decorations (pseudo-elements) are used.
// This prevents glyph width mismatch between overlay and textarea.
const lineStyles: Record<OverlayLine['type'], string> = {
  header1: 'text-foreground',
  header2: 'text-foreground',
  header3: 'text-foreground',
  subtext: 'text-muted-foreground',
  blockquote: 'text-muted-foreground',
  listItem: 'text-foreground',
  orderedListItem: 'text-foreground',
  separator: 'text-muted-foreground',
  codeBlockDelimiter: 'text-muted-foreground discord-overlay-code',
  codeBlockLine: 'text-foreground discord-overlay-code',
  normal: 'text-foreground',
};

// All types use identical metrics - no exceptions
export const OVERLAY_FONT_SIZE = '0.875rem';
export const OVERLAY_LINE_HEIGHT = '1.25rem';
export const INPUT_FONT_FAMILY = '"gg sans", "Noto Sans", Helvetica, sans-serif';

export function hasInlineMarkdown(content: string): boolean {
  if (!content) return false;
  return /(\*\*.+?\*\*|\*.+?\*|__.+?__|~~.+?~~|`.+?`|\|\|.+?\|\||\[.+?\]\(.+?\))/.test(content);
}

export function hasInlineMentions(content: string, mentionData?: MentionLookupData): boolean {
  if (!content) return false;
  if (/<@&?\d{18}>|<#\d{18}>|@everyone|@here/.test(content)) return true;
  if (mentionData) {
    if (mentionData.members?.some(m => content.includes(`@${m.displayName}`))) return true;
    if (mentionData.roles?.some(r => content.includes(`@${r.name}`))) return true;
    if (mentionData.channels?.some(c => content.includes(`#${c.name}`))) return true;
  }
  return false;
}

export function getLineTypeAtCursor(content: string, cursorPos: number): OverlayLine['type'] {
  if (!content) return 'normal';
  const textBefore = content.slice(0, cursorPos);
  const lastNewline = textBefore.lastIndexOf('\n');
  const currentLine = content.slice(lastNewline + 1).split('\n')[0];

  const linesBefore = textBefore.split('\n');
  let inCodeBlock = false;
  for (const l of linesBefore) {
    if (l.startsWith('```')) inCodeBlock = !inCodeBlock;
  }

  if (inCodeBlock && !currentLine.startsWith('```')) return 'codeBlockLine';
  if (currentLine.startsWith('```')) return 'codeBlockDelimiter';
  if (currentLine.startsWith('### ')) return 'header3';
  if (currentLine.startsWith('## ')) return 'header2';
  if (currentLine.startsWith('# ')) return 'header1';
  if (currentLine.startsWith('-# ')) return 'subtext';
  if (currentLine.startsWith('> ') || currentLine.startsWith('>>> ')) return 'blockquote';
  if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(currentLine.trim())) return 'separator';
  if (/^(\s*)[-*] /.test(currentLine)) return 'listItem';
  if (/^(\s*)\d+\. /.test(currentLine)) return 'orderedListItem';
  return 'normal';
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Render mention badges inline - resolves Snowflake IDs to display names AND short-form mentions
function renderMentionsInline(text: string, mentionData?: MentionLookupData): string | ReactNode[] {
  if (!text) return text;

  // Build a unified regex covering both protocol tokens and short-form names
  const patterns: string[] = [
    '<@&(\\d{18})>',   // group 1: role snowflake
    '<@(\\d{18})>',    // group 2: user snowflake
    '<#(\\d{18})>',    // group 3: channel snowflake
    '@everyone',
    '@here',
  ];

  const members = mentionData?.members ?? [];
  const roles = mentionData?.roles ?? [];
  const channels = mentionData?.channels ?? [];

  // Sort by name length desc to avoid sub-name shadowing (e.g. "Adrien" inside "Adrien Moulin")
  const sortedMembers = [...members].sort((a, b) => b.displayName.length - a.displayName.length);
  const sortedRoles = [...roles].sort((a, b) => b.name.length - a.name.length);
  const sortedChannels = [...channels].sort((a, b) => b.name.length - a.name.length);

  const memberAlt = sortedMembers.map(m => escapeRegex(m.displayName)).join('|');
  const roleAlt = sortedRoles.map(r => escapeRegex(r.name)).join('|');
  const channelAlt = sortedChannels.map(c => escapeRegex(c.name)).join('|');

  // Short-form: @<member-name>, @<role-name>, #<channel-name>
  // Use lookahead to avoid catching partial matches followed by word chars
  if (memberAlt) patterns.push(`@(${memberAlt})(?![\\w\\u00C0-\\u024F])`);   // group 4
  if (roleAlt) patterns.push(`@(${roleAlt})(?![\\w\\u00C0-\\u024F])`);       // group 5 (or 4)
  if (channelAlt) patterns.push(`#(${channelAlt})(?![\\w\\u00C0-\\u024F-])`); // group 6 (or 4/5)

  // Build regex carefully tracking group offsets
  const mentionRegex = new RegExp('(' + patterns.join('|') + ')', 'g');

  // We need to identify which alternative matched. Use indexed groups:
  // 1=outer, 2=roleSnow, 3=userSnow, 4=chSnow, 5=memberShort, 6=roleShort, 7=channelShort
  // Adjust based on which short patterns are present.
  let memberGroupIdx = -1;
  let roleGroupIdx = -1;
  let channelGroupIdx = -1;
  let nextGroup = 5; // after the 4 base groups (outer + 3 snowflake captures)
  if (memberAlt) { memberGroupIdx = nextGroup++; }
  if (roleAlt) { roleGroupIdx = nextGroup++; }
  if (channelAlt) { channelGroupIdx = nextGroup++; }

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  let found = false;

  while ((match = mentionRegex.exec(text)) !== null) {
    found = true;
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }

    const full = match[0];
    const roleSnow = match[2];
    const userSnow = match[3];
    const channelSnow = match[4];
    const memberShort = memberGroupIdx > 0 ? match[memberGroupIdx] : undefined;
    const roleShort = roleGroupIdx > 0 ? match[roleGroupIdx] : undefined;
    const channelShort = channelGroupIdx > 0 ? match[channelGroupIdx] : undefined;

    if (full === '@everyone' || full === '@here') {
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px]" style={{ backgroundColor: 'rgba(250,166,26,0.3)', color: '#faa61a' }}>
          {full}
        </span>
      );
    } else if (userSnow !== undefined) {
      const uuid = snowflakeToUuid(userSnow);
      const member = uuid ? members.find(m => m.id === uuid) : undefined;
      const displayName = member ? `@${member.displayName}` : full;
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px] bg-primary/30 text-[#dee0fc]">
          {displayName}
        </span>
      );
    } else if (roleSnow !== undefined) {
      const uuid = snowflakeToUuid(roleSnow);
      const role = uuid ? roles.find(r => r.id === uuid) : undefined;
      const roleColor = role?.color || '#99aab5';
      const displayName = role ? `@${role.name}` : full;
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px]" style={{ backgroundColor: `${roleColor}4D`, color: roleColor }}>
          {displayName}
        </span>
      );
    } else if (channelSnow !== undefined) {
      const uuid = snowflakeToUuid(channelSnow);
      const channel = uuid ? channels.find(c => c.id === uuid) : undefined;
      const displayName = channel ? `#${channel.name}` : full;
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px] bg-primary/30 text-[#dee0fc]">
          {displayName}
        </span>
      );
    } else if (memberShort !== undefined) {
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px] bg-primary/30 text-[#dee0fc]">
          {`@${memberShort}`}
        </span>
      );
    } else if (roleShort !== undefined) {
      const role = roles.find(r => r.name === roleShort);
      const roleColor = role?.color || '#99aab5';
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px]" style={{ backgroundColor: `${roleColor}4D`, color: roleColor }}>
          {`@${roleShort}`}
        </span>
      );
    } else if (channelShort !== undefined) {
      parts.push(
        <span key={key++} className="rounded-[3px] px-[2px] bg-primary/30 text-[#dee0fc]">
          {`#${channelShort}`}
        </span>
      );
    } else {
      parts.push(<span key={key++}>{full}</span>);
    }

    lastIndex = match.index + full.length;
  }

  if (!found) return text;

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts;
}

// Inline markdown rendering - uses ONLY color/decoration, never font metrics
function renderInlineMarkdown(text: string, mentionData?: MentionLookupData): ReactNode {
  if (!text) return '\u200B';
  
  // First pass: render mentions
  const mentionRendered = renderMentionsInline(text, mentionData);
  
  // If mentions were found and returned as ReactNode[], we skip further inline markdown on those parts
  // For simplicity, if mentions are present, return mention-rendered result
  if (Array.isArray(mentionRendered)) {
    // Process each text span for inline markdown
    return mentionRendered.map((part, i) => {
      if (typeof part === 'object' && part !== null && 'props' in part) {
        const props = (part as any).props;
        // If it's a mention badge (has className with rounded), pass through
        if (props.className && props.className.includes('rounded')) return part;
        // If it's a plain text span, process for inline markdown
        if (props.children && typeof props.children === 'string') {
          const inlineResult = renderInlineMarkdownOnly(props.children);
          if (inlineResult !== props.children) {
            return <span key={`im-${i}`}>{inlineResult}</span>;
          }
        }
      }
      return part;
    });
  }
  
  return renderInlineMarkdownOnly(text);
}

function renderInlineMarkdownOnly(text: string): ReactNode {
  if (!text) return '\u200B';

  // Regex to match inline patterns - order matters (longest/most specific first)
  const inlineRegex = /(\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\|\|(.+?)\|\||`(.+?)`|\[(.+?)\]\((.+?)\)|\*(.+?)\*|_(.+?)_)/g;
  
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  
  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    const full = match[0];
    
    if (match[2] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">**</span>
          <span className="text-foreground">{match[2]}</span>
          <span className="text-muted-foreground/50">**</span>
        </span>
      );
    } else if (match[3] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">__</span>
          <span className="text-foreground underline">{match[3]}</span>
          <span className="text-muted-foreground/50">__</span>
        </span>
      );
    } else if (match[4] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">~~</span>
          <span className="text-foreground line-through">{match[4]}</span>
          <span className="text-muted-foreground/50">~~</span>
        </span>
      );
    } else if (match[5] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">||</span>
          <span className="text-foreground bg-muted/50 rounded-[3px]">{match[5]}</span>
          <span className="text-muted-foreground/50">||</span>
        </span>
      );
    } else if (match[6] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">`</span>
          <span className="bg-muted/40 rounded-[3px] text-[hsl(340,65%,65%)]">{match[6]}</span>
          <span className="text-muted-foreground/50">`</span>
        </span>
      );
    } else if (match[7] !== undefined && match[8] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">[</span>
          <span className="text-foreground">{match[7]}</span>
          <span className="text-muted-foreground/50">](</span>
          <span className="text-muted-foreground/40">{match[8]}</span>
          <span className="text-muted-foreground/50">)</span>
        </span>
      );
    } else if (match[9] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">*</span>
          <span className="text-foreground">{match[9]}</span>
          <span className="text-muted-foreground/50">*</span>
        </span>
      );
    } else if (match[10] !== undefined) {
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">_</span>
          <span className="text-foreground">{match[10]}</span>
          <span className="text-muted-foreground/50">_</span>
        </span>
      );
    } else {
      parts.push(<span key={key++}>{full}</span>);
    }
    
    lastIndex = match.index + full.length;
  }
  
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : text;
}

export const InputMarkdownOverlay = forwardRef<HTMLDivElement, InputMarkdownOverlayProps>(
  ({ content, compact = false, className, mentionData }, ref) => {
    const lines = useMemo(() => parseLines(content), [content]);
    const hasMarkdown = useMemo(() => 
      lines.some((line) => line.type !== 'normal') || hasInlineMarkdown(content) || hasInlineMentions(content),
      [lines, content]
    );

    if (!hasMarkdown) return null;

    const defaultPadding = compact ? 'py-1 pr-2 min-h-[28px]' : 'py-2.5 pr-1 min-h-[40px]';

    return (
      <div
        ref={ref}
        aria-hidden
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words box-border text-sm leading-5 font-normal tracking-normal ${
          className || defaultPadding
        }`}
        style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${lineStyles[line.type]} relative`}
            style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
          >
            {line.type === 'codeBlockLine' || line.type === 'codeBlockDelimiter'
              ? (line.text || '\u200B')
              : renderInlineMarkdown(line.text, mentionData)
            }
          </div>
        ))}
      </div>
    );
  }
);

InputMarkdownOverlay.displayName = 'InputMarkdownOverlay';
