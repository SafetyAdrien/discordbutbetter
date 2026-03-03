import { useMemo, forwardRef, ReactNode } from 'react';

interface InputMarkdownOverlayProps {
  content: string;
  compact?: boolean;
  className?: string;
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
    if (line.startsWith('> ') || line.startsWith('>>> ') || (line.startsWith('>') && line.length > 1 && line[1] !== '>')) { result.push({ type: 'blockquote', text: line }); continue; }
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
  blockquote: 'text-muted-foreground discord-overlay-blockquote',
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

// Inline markdown rendering - uses ONLY color/decoration, never font metrics
function renderInlineMarkdown(text: string): ReactNode {
  if (!text) return '\u200B';
  
  // Regex to match inline patterns - order matters (longest/most specific first)
  const inlineRegex = /(\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|\|\|(.+?)\|\||`(.+?)`|\[(.+?)\]\((.+?)\)|\*(.+?)\*|_(.+?)_)/g;
  
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  
  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    
    const full = match[0];
    
    if (match[2] !== undefined) {
      // **bold**
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">**</span>
          <span className="text-foreground">{match[2]}</span>
          <span className="text-muted-foreground/50">**</span>
        </span>
      );
    } else if (match[3] !== undefined) {
      // __underline__
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">__</span>
          <span className="text-foreground underline">{match[3]}</span>
          <span className="text-muted-foreground/50">__</span>
        </span>
      );
    } else if (match[4] !== undefined) {
      // ~~strikethrough~~
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">~~</span>
          <span className="text-foreground line-through">{match[4]}</span>
          <span className="text-muted-foreground/50">~~</span>
        </span>
      );
    } else if (match[5] !== undefined) {
      // ||spoiler||
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">||</span>
          <span className="text-foreground bg-muted/50 rounded-[3px]">{match[5]}</span>
          <span className="text-muted-foreground/50">||</span>
        </span>
      );
    } else if (match[6] !== undefined) {
      // `code`
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">`</span>
          <span className="bg-muted/40 rounded-[3px] text-[hsl(340,65%,65%)]">{match[6]}</span>
          <span className="text-muted-foreground/50">`</span>
        </span>
      );
    } else if (match[7] !== undefined && match[8] !== undefined) {
      // [text](url)
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
      // *italic*
      parts.push(
        <span key={key++}>
          <span className="text-muted-foreground/50">*</span>
          <span className="text-foreground">{match[9]}</span>
          <span className="text-muted-foreground/50">*</span>
        </span>
      );
    } else if (match[10] !== undefined) {
      // _italic_
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
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : text;
}

export const InputMarkdownOverlay = forwardRef<HTMLDivElement, InputMarkdownOverlayProps>(
  ({ content, compact = false, className }, ref) => {
    const lines = useMemo(() => parseLines(content), [content]);
    const hasMarkdown = useMemo(() => 
      lines.some((line) => line.type !== 'normal') || hasInlineMarkdown(content),
      [lines, content]
    );

    if (!hasMarkdown) return null;

    const defaultPadding = compact ? 'py-1 pr-2 min-h-[28px]' : 'py-2.5 pr-1 min-h-[40px]';

    return (
      <div
        ref={ref}
        aria-hidden
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words box-border text-sm leading-5 font-normal tracking-normal border border-transparent ${
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
              : renderInlineMarkdown(line.text)
            }
          </div>
        ))}
      </div>
    );
  }
);

InputMarkdownOverlay.displayName = 'InputMarkdownOverlay';
