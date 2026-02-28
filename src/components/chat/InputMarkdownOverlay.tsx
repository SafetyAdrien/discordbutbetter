import { useMemo, forwardRef } from 'react';

interface InputMarkdownOverlayProps {
  content: string;
  compact?: boolean;
}

interface OverlayLine {
  type: 'header1' | 'header2' | 'header3' | 'subtext' | 'blockquote' | 'listItem' | 'orderedListItem' | 'codeBlockDelimiter' | 'codeBlockLine' | 'normal';
  text: string;
}

function parseLines(content: string): OverlayLine[] {
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
  codeBlockDelimiter: 'text-muted-foreground discord-overlay-code',
  codeBlockLine: 'text-foreground discord-overlay-code',
  normal: 'text-foreground',
};

// All types use identical metrics - no exceptions
export const OVERLAY_FONT_SIZE = '0.875rem';
export const OVERLAY_LINE_HEIGHT = '1.25rem';
export const INPUT_FONT_FAMILY = '"gg sans", "Noto Sans", Helvetica, sans-serif';

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
  if (/^(\s*)[-*] /.test(currentLine)) return 'listItem';
  if (/^(\s*)\d+\. /.test(currentLine)) return 'orderedListItem';
  return 'normal';
}

export const InputMarkdownOverlay = forwardRef<HTMLDivElement, InputMarkdownOverlayProps>(
  ({ content, compact = false }, ref) => {
    const lines = useMemo(() => parseLines(content), [content]);
    const hasMarkdown = useMemo(() => lines.some((line) => line.type !== 'normal'), [lines]);

    if (!hasMarkdown) return null;

    return (
      <div
        ref={ref}
        aria-hidden
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words box-border text-sm leading-5 font-normal tracking-normal ${
          compact ? 'py-1 pr-2 min-h-[28px]' : 'pt-[11px] pb-[9px] pr-1 min-h-[40px]'
        }`}
        style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${lineStyles[line.type]} relative`}
            style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
          >
            {line.text || '\u200B'}
          </div>
        ))}
      </div>
    );
  }
);

InputMarkdownOverlay.displayName = 'InputMarkdownOverlay';
