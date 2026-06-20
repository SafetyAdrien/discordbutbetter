import { useMemo, forwardRef, ReactNode, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { snowflakeToUuid } from '@/lib/snowflake';
import { MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';

export interface MentionLookupData {
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
}

export interface MentionEntry {
  display: string;
  token: string;
  kind: 'user' | 'role' | 'channel';
  color?: string;
}

interface InputMarkdownOverlayProps {
  content: string;
  compact?: boolean;
  className?: string;
  mentionData?: MentionLookupData;
  mentionEntries?: MentionEntry[];
}

interface OverlayLine {
  type: 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'listItem' | 'orderedListItem' | 'taskItemUnchecked' | 'taskItemChecked' | 'codeBlockDelimiter' | 'codeBlockLine' | 'separator' | 'normal';
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
    if (/^(\s*)[-*] \[x\] /i.test(line)) { result.push({ type: 'taskItemChecked', text: line }); continue; }
    if (/^(\s*)[-*] \[ \] /.test(line)) { result.push({ type: 'taskItemUnchecked', text: line }); continue; }
    if (/^(\s*)[-*] /.test(line)) { result.push({ type: 'listItem', text: line }); continue; }
    if (/^(\s*)\d+\. /.test(line)) { result.push({ type: 'orderedListItem', text: line }); continue; }
    result.push({ type: 'normal', text: line });
  }

  return result;
}

// CRITICAL: the overlay must keep the same text metrics as the textarea.
// No real font-weight, font-family, font-size, padding, or margin changes in inline spans.
// Discord-like effects below are visual-only so the caret does not drift.
const lineStyles: Record<OverlayLine['type'], string> = {
  header1: 'text-foreground',
  header2: 'text-foreground',
  header3: 'text-foreground',
  subtext: 'text-muted-foreground',
  blockquote: 'text-muted-foreground',
  listItem: 'text-foreground',
  orderedListItem: 'text-foreground',
  taskItemUnchecked: 'text-foreground',
  taskItemChecked: 'text-muted-foreground',
  separator: 'text-muted-foreground',
  codeBlockDelimiter: 'text-muted-foreground/60',
  codeBlockLine: 'text-foreground',
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

export function hasInlineMentions(content: string, entries?: MentionEntry[]): boolean {
  if (!content) return false;
  if (/<@&?\d{18}>|<#\d{18}>|@everyone|@here/.test(content)) return true;
  if (entries && entries.length > 0) {
    return entries.some(e => content.includes(e.display));
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
  if (/^(\s*)[-*] \[x\] /i.test(currentLine)) return 'taskItemChecked';
  if (/^(\s*)[-*] \[ \] /.test(currentLine)) return 'taskItemUnchecked';
  if (/^(\s*)[-*] /.test(currentLine)) return 'listItem';
  if (/^(\s*)\d+\. /.test(currentLine)) return 'orderedListItem';
  return 'normal';
}

interface MentionConsumer {
  entries: MentionEntry[];
  idx: number;
}

// CRITICAL: pills must not add ANY horizontal layout width (no padding, no margin)
// — otherwise the textarea caret drifts away from the visible mention text.
// We fake the side padding with a horizontal-only box-shadow which is purely
// visual and does not affect layout.
const PRIMARY_PILL_BG = 'hsl(var(--primary) / 0.30)';
const sideShadow = (color: string) => `${color} 2px 0 0 0, ${color} -2px 0 0 0`;

function pillClassFor(kind: MentionEntry['kind']): string {
  return 'rounded-[3px] bg-primary/30 text-[#dee0fc]';
}

function renderMentionEntry(entry: MentionEntry, key: number): ReactNode {
  if (entry.kind === 'role' && entry.color) {
    const bg = `${entry.color}4D`;
    return (
      <span key={key} className="rounded-[3px]" style={{ backgroundColor: bg, color: entry.color, boxShadow: sideShadow(bg) }}>
        {entry.display}
      </span>
    );
  }
  return (
    <span key={key} className={pillClassFor(entry.kind)} style={{ boxShadow: sideShadow(PRIMARY_PILL_BG) }}>
      {entry.display}
    </span>
  );
}


// Try to match entries (in order) at substrings of `text`. Mutates consumer.idx.
function consumeEntryMentions(text: string, consumer: MentionConsumer, keyStart: number): { nodes: ReactNode[]; consumed: boolean; nextKey: number } {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = keyStart;
  let consumed = false;
  while (consumer.idx < consumer.entries.length) {
    const entry = consumer.entries[consumer.idx];
    if (!entry.display) { consumer.idx++; continue; }
    const at = text.indexOf(entry.display, cursor);
    if (at === -1) break; // try next line
    if (at > cursor) {
      nodes.push(<span key={key++}>{text.slice(cursor, at)}</span>);
    }
    nodes.push(renderMentionEntry(entry, key++));
    cursor = at + entry.display.length;
    consumer.idx++;
    consumed = true;
  }
  if (!consumed) return { nodes: [], consumed: false, nextKey: keyStart };
  if (cursor < text.length) {
    nodes.push(<span key={key++}>{text.slice(cursor)}</span>);
  }
  return { nodes, consumed: true, nextKey: key };
}

// Render legacy <@SNOWFLAKE>, <#…>, <@&…> tokens and @everyone/@here in a single text segment.
function renderLegacyAndSpecialMentions(text: string, mentionData: MentionLookupData | undefined, keyStart: number): { nodes: ReactNode[]; found: boolean; nextKey: number } {
  const mentionRegex = /(<@&(\d{18})>|<@(\d{18})>|<#(\d{18})>|@everyone|@here)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = keyStart;
  let found = false;

  while ((match = mentionRegex.exec(text)) !== null) {
    found = true;
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    const full = match[0];
    if (full === '@everyone' || full === '@here') {
      const bg = 'rgba(250,166,26,0.3)';
      parts.push(
        <span key={key++} className="rounded-[3px]" style={{ backgroundColor: bg, color: '#faa61a', boxShadow: sideShadow(bg) }}>
          {full}
        </span>
      );
    } else if (match[3] !== undefined) {
      const uuid = snowflakeToUuid(match[3]);
      const member = uuid ? mentionData?.members?.find(m => m.id === uuid) : undefined;
      const displayName = member ? `@${member.displayName}` : full;
      parts.push(<span key={key++} className="rounded-[3px] bg-primary/30 text-[#dee0fc]" style={{ boxShadow: sideShadow(PRIMARY_PILL_BG) }}>{displayName}</span>);
    } else if (match[2] !== undefined) {
      const uuid = snowflakeToUuid(match[2]);
      const role = uuid ? mentionData?.roles?.find(r => r.id === uuid) : undefined;
      const roleColor = role?.color || '#99aab5';
      const displayName = role ? `@${role.name}` : full;
      const bg = `${roleColor}4D`;
      parts.push(<span key={key++} className="rounded-[3px]" style={{ backgroundColor: bg, color: roleColor, boxShadow: sideShadow(bg) }}>{displayName}</span>);
    } else if (match[4] !== undefined) {
      const uuid = snowflakeToUuid(match[4]);
      const channel = uuid ? mentionData?.channels?.find(c => c.id === uuid) : undefined;
      const displayName = channel ? `#${channel.name}` : full;
      parts.push(<span key={key++} className="rounded-[3px] bg-primary/30 text-[#dee0fc]" style={{ boxShadow: sideShadow(PRIMARY_PILL_BG) }}>{displayName}</span>);
    } else {
      parts.push(<span key={key++}>{full}</span>);
    }
    lastIndex = match.index + full.length;
  }

  if (!found) return { nodes: [], found: false, nextKey: keyStart };
  if (lastIndex < text.length) parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  return { nodes: parts, found: true, nextKey: key };
}

// Inline rendering for a single line. Receives a shared mention consumer for entry-based mentions.
function renderInlineMarkdown(text: string, mentionData: MentionLookupData | undefined, consumer: MentionConsumer): ReactNode {
  if (!text) return '\u200B';

  // 1) Entry-based mentions (display-text from current draft). These have the same length in textarea and overlay.
  const entryResult = consumeEntryMentions(text, consumer, 0);

  // The output we will iterate to apply legacy + inline markdown on text spans.
  let workingNodes: ReactNode[];
  if (entryResult.consumed) {
    workingNodes = entryResult.nodes;
  } else {
    workingNodes = [text];
  }

  // 2) Pass each plain-text segment through legacy mention regex (drafts / pasted tokens), then inline markdown.
  const finalNodes: ReactNode[] = [];
  let key = 1000;
  for (const node of workingNodes) {
    if (typeof node === 'string') {
      const legacy = renderLegacyAndSpecialMentions(node, mentionData, key);
      key = legacy.nextKey + 1;
      if (legacy.found) {
        for (const sub of legacy.nodes) {
          if (typeof sub === 'object' && sub !== null && 'props' in (sub as any)) {
            const props = (sub as any).props;
            if (props.className && props.className.includes('rounded')) {
              finalNodes.push(sub);
            } else if (typeof props.children === 'string') {
              finalNodes.push(<span key={key++}>{renderInlineMarkdownOnly(props.children)}</span>);
            } else {
              finalNodes.push(sub);
            }
          } else {
            finalNodes.push(sub);
          }
        }
      } else {
        finalNodes.push(<span key={key++}>{renderInlineMarkdownOnly(node)}</span>);
      }
    } else if (typeof node === 'object' && node !== null && 'props' in (node as any)) {
      const props = (node as any).props;
      if (props.className && props.className.includes('rounded')) {
        finalNodes.push(node);
      } else if (typeof props.children === 'string') {
        finalNodes.push(<span key={key++}>{renderInlineMarkdownOnly(props.children)}</span>);
      } else {
        finalNodes.push(node);
      }
    } else {
      finalNodes.push(node);
    }
  }

  return finalNodes;
}


function renderInlineMarkdownOnly(text: string): ReactNode {
  if (!text) return '\u200B';

  type InlineKind = 'bold' | 'italic' | 'boldItalic' | 'underline' | 'underlineBold' | 'underlineItalic' | 'underlineBoldItalic' | 'strike' | 'spoiler' | 'code' | 'link';
  type InlinePattern = { regex: RegExp; kind: InlineKind; open: string; close: string; labelGroup?: number; urlGroup?: number };
  const patterns: InlinePattern[] = [
    { regex: /__\*\*\*([^\n]+?)\*\*\*__/g, kind: 'underlineBoldItalic', open: '__***', close: '***__' },
    { regex: /\*\*\*__([^\n]+?)__\*\*\*/g, kind: 'underlineBoldItalic', open: '***__', close: '__***' },
    { regex: /___([^\n]+?)___/g, kind: 'underlineBoldItalic', open: '___', close: '___' },
    { regex: /__\*\*([^\n]+?)\*\*__/g, kind: 'underlineBold', open: '__**', close: '**__' },
    { regex: /\*\*__([^\n]+?)__\*\*/g, kind: 'underlineBold', open: '**__', close: '__**' },
    { regex: /__\*([^\n]+?)\*__/g, kind: 'underlineItalic', open: '__*', close: '*__' },
    { regex: /\*__([^\n]+?)__\*/g, kind: 'underlineItalic', open: '*__', close: '__*' },
    { regex: /\*\*\*([^\n]+?)\*\*\*/g, kind: 'boldItalic', open: '***', close: '***' },
    { regex: /\*\*([^\n]+?)\*\*/g, kind: 'bold', open: '**', close: '**' },
    { regex: /__([^\n]+?)__/g, kind: 'underline', open: '__', close: '__' },
    { regex: /~~([^\n]+?)~~/g, kind: 'strike', open: '~~', close: '~~' },
    { regex: /\|\|([^\n]+?)\|\|/g, kind: 'spoiler', open: '||', close: '||' },
    { regex: /`([^`\n]+?)`/g, kind: 'code', open: '`', close: '`' },
    { regex: /\[([^\]\n]+?)\]\(([^)\n]+?)\)/g, kind: 'link', open: '[', close: ')', labelGroup: 1, urlGroup: 2 },
    { regex: /(?<!\*)\*([^*\n]+?)\*(?!\*)/g, kind: 'italic', open: '*', close: '*' },
    { regex: /(?<!_)_([^_\n]+?)_(?!_)/g, kind: 'italic', open: '_', close: '_' },
  ];

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  const marker = (s: string) => (
    <span aria-hidden style={{ opacity: 0.35, color: 'hsl(var(--muted-foreground))' }}>{s}</span>
  );

  const boldStyle: React.CSSProperties = {
    color: 'hsl(var(--foreground))',
    textShadow: '0.55px 0 0 currentColor, -0.55px 0 0 currentColor, 0 0.32px 0 currentColor, 0 -0.32px 0 currentColor',
  };
  const italicStyle: React.CSSProperties = {
    display: 'inline-block',
    transform: 'skewX(-10deg)',
    transformOrigin: 'center',
  };
  const codeStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--surface-elevated))',
    boxShadow: '0 0 0 1px hsl(var(--border) / 0.65), hsl(var(--surface-elevated)) 2px 0 0 0, hsl(var(--surface-elevated)) -2px 0 0 0',
    color: 'hsl(var(--foreground))',
    borderRadius: '3px',
  };

  const renderStyled = (kind: InlineKind, inner: string, open: string, close: string, url?: string) => {
    if (kind === 'link') {
      return <span key={key++}>{marker(open)}<span className="text-primary underline underline-offset-2">{inner}</span>{marker('](')}<span style={{ opacity: 0 }}>{url}</span>{marker(close)}</span>;
    }
    if (kind === 'code') return <span key={key++} style={codeStyle}>{marker(open)}{inner}{marker(close)}</span>;
    if (kind === 'spoiler') {
      return <span key={key++}>{marker(open)}<span className="rounded-[3px]" style={{ backgroundColor: 'hsl(var(--foreground) / 0.22)', boxShadow: '0 0 0 1px hsl(var(--foreground) / 0.07)' }}>{inner}</span>{marker(close)}</span>;
    }
    const style: React.CSSProperties = {
      ...(kind === 'bold' || kind === 'boldItalic' || kind === 'underlineBold' || kind === 'underlineBoldItalic' ? boldStyle : undefined),
      ...(kind === 'italic' || kind === 'boldItalic' || kind === 'underlineItalic' || kind === 'underlineBoldItalic' ? italicStyle : undefined),
    };
    const className = [
      kind === 'underline' || kind === 'underlineBold' || kind === 'underlineItalic' || kind === 'underlineBoldItalic' ? 'underline decoration-foreground/80 underline-offset-2' : '',
      kind === 'strike' ? 'line-through decoration-foreground/70' : '',
    ].filter(Boolean).join(' ');
    return <span key={key++}>{marker(open)}<span className={className || undefined} style={style}>{inner}</span>{marker(close)}</span>;
  };

  while (cursor < text.length) {
    let best: { pattern: InlinePattern; match: RegExpExecArray; order: number } | null = null;
    patterns.forEach((pattern, order) => {
      pattern.regex.lastIndex = cursor;
      const match = pattern.regex.exec(text);
      if (!match) return;
      if (!best || match.index < best.match.index || (match.index === best.match.index && (match[0].length > best.match[0].length || order < best.order))) {
        best = { pattern, match, order };
      }
    });

    if (!best) {
      parts.push(<span key={key++}>{text.slice(cursor)}</span>);
      break;
    }

    const { pattern, match } = best;
    if (match.index > cursor) parts.push(<span key={key++}>{text.slice(cursor, match.index)}</span>);
    const inner = pattern.kind === 'link' ? match[pattern.labelGroup ?? 1] : match[1];
    const url = pattern.kind === 'link' ? match[pattern.urlGroup ?? 2] : undefined;
    parts.push(renderStyled(pattern.kind, inner, pattern.open, pattern.close, url));
    cursor = match.index + match[0].length;
  }

  return parts.length > 0 ? parts : text;
}

interface CodeBlockBoxProps {
  innerLines: string[];
}

function CodeBlockCopyButton({ innerLines }: CodeBlockBoxProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = innerLines.join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleCopy}
      aria-label="Copier le code"
      className="absolute top-0.5 right-0.5 w-6 h-6 flex items-center justify-center rounded-[3px] bg-background/60 text-muted-foreground hover:text-foreground"
      style={{ pointerEvents: 'auto' }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

interface RenderableNode {
  kind: 'line' | 'codeBlock';
  line?: OverlayLine;
  blockLines?: OverlayLine[];
  innerCode?: string[];
}

function groupRenderables(lines: OverlayLine[]): RenderableNode[] {
  const out: RenderableNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'codeBlockDelimiter') {
      // Look ahead for closing delimiter
      const block: OverlayLine[] = [line];
      const inner: string[] = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const l = lines[j];
        block.push(l);
        if (l.type === 'codeBlockDelimiter') {
          closed = true;
          j++;
          break;
        }
        if (l.type === 'codeBlockLine') inner.push(l.text);
        j++;
      }
      if (closed) {
        out.push({ kind: 'codeBlock', blockLines: block, innerCode: inner });
        i = j;
        continue;
      }
      // Not closed: render each line as a normal line (no box)
      out.push({ kind: 'line', line: { type: 'normal', text: line.text } });
      i++;
      continue;
    }
    if (line.type === 'codeBlockLine') {
      // Orphan code line (unclosed block) — render as normal
      out.push({ kind: 'line', line: { type: 'normal', text: line.text } });
      i++;
      continue;
    }
    out.push({ kind: 'line', line });
    i++;
  }
  return out;
}

export const InputMarkdownOverlay = forwardRef<HTMLDivElement, InputMarkdownOverlayProps>(
  ({ content, compact = false, className, mentionData, mentionEntries }, ref) => {
    const lines = useMemo(() => parseLines(content), [content]);
    const renderables = useMemo(() => groupRenderables(lines), [lines]);
    const hasMarkdown = useMemo(() =>
      lines.some((line) => line.type !== 'normal') || hasInlineMarkdown(content) || hasInlineMentions(content, mentionEntries),
      [lines, content, mentionEntries]
    );

    if (!hasMarkdown) return null;

    const defaultPadding = compact ? 'py-1 pr-2 min-h-[28px]' : 'py-2.5 pr-1 min-h-[40px]';
    const consumer: MentionConsumer = { entries: mentionEntries ?? [], idx: 0 };

    const renderPlainLine = (line: OverlayLine, key: number) => {
      const isChecked = line.type === 'taskItemChecked';
      let prefix = '';
      let rest = line.text;
      if (line.type === 'listItem' || line.type === 'orderedListItem' || line.type === 'taskItemChecked' || line.type === 'taskItemUnchecked') {
        const m = line.text.match(/^(\s*(?:[-*]|\d+\.)(?:\s\[[ xX]\])?\s)/);
        if (m) {
          prefix = m[1];
          rest = line.text.slice(m[1].length);
        }
      }
      return (
        <div
          key={key}
          className={`${lineStyles[line.type]} relative ${isChecked ? 'line-through' : ''}`}
          style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
        >
          {prefix && <span className="text-muted-foreground/70">{prefix}</span>}
          {renderInlineMarkdown(rest, mentionData, consumer)}
        </div>
      );
    };

    let keyCounter = 0;

    return (
      <div
        ref={ref}
        aria-hidden
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words box-border text-sm leading-5 font-normal tracking-normal ${
          className || defaultPadding
        }`}
        style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal', fontSynthesis: 'none' }}
      >
        {renderables.map((node) => {
          if (node.kind === 'line' && node.line) {
            return renderPlainLine(node.line, keyCounter++);
          }
          // code block group: single bordered box, no padding (preserves caret alignment)
          const block = node.blockLines!;
          const inner = node.innerCode ?? [];
          return (
            <div
              key={keyCounter++}
              className="relative rounded-[4px]"
              style={{
                backgroundColor: 'hsl(var(--surface-elevated))',
                boxShadow: 'inset 0 0 0 1px hsl(var(--border) / 0.4)',
              }}
            >
              {block.map((l) => {
                const isCode = l.type === 'codeBlockLine' || l.type === 'codeBlockDelimiter';
                return (
                  <div
                    key={keyCounter++}
                    className={lineStyles[l.type]}
                    style={{
                      fontSize: OVERLAY_FONT_SIZE,
                      lineHeight: OVERLAY_LINE_HEIGHT,
                      fontFamily: INPUT_FONT_FAMILY,
                      fontWeight: 400,
                      letterSpacing: 'normal',
                      color: isCode ? 'hsl(var(--foreground) / 0.92)' : undefined,
                    }}
                  >
                    {l.text || '\u200B'}
                  </div>
                );
              })}

            </div>
          );
        })}
      </div>
    );
  }
);

InputMarkdownOverlay.displayName = 'InputMarkdownOverlay';

