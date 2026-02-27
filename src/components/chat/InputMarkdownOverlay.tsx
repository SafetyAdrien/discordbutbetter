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

// IMPORTANT: All line types share the same font-size and line-height in input overlay
// to keep native textarea caret geometry aligned across browsers (especially Firefox).
const lineStyles: Record<OverlayLine['type'], string> = {
  header1: 'font-bold text-foreground',
  header2: 'font-bold text-foreground',
  header3: 'font-semibold text-foreground',
  subtext: 'text-muted-foreground',
  blockquote: 'text-muted-foreground discord-overlay-blockquote',
  listItem: 'text-foreground',
  orderedListItem: 'text-foreground',
  codeBlockDelimiter: 'font-mono text-muted-foreground discord-overlay-code',
  codeBlockLine: 'font-mono text-foreground discord-overlay-code',
  normal: 'text-foreground',
};

const lineHeightStyles: Record<OverlayLine['type'], string> = {
  header1: 'leading-5',
  header2: 'leading-5',
  header3: 'leading-5',
  subtext: 'leading-5',
  blockquote: 'leading-5',
  listItem: 'leading-5',
  orderedListItem: 'leading-5',
  codeBlockDelimiter: 'leading-5',
  codeBlockLine: 'leading-5',
  normal: 'leading-5',
};

// Keep exported maps for compatibility with MessageInput caret logic.
export const lineFontSizes: Record<OverlayLine['type'], string> = {
  header1: '0.875rem',
  header2: '0.875rem',
  header3: '0.875rem',
  subtext: '0.875rem',
  blockquote: '0.875rem',
  listItem: '0.875rem',
  orderedListItem: '0.875rem',
  codeBlockDelimiter: '0.875rem',
  codeBlockLine: '0.875rem',
  normal: '0.875rem',
};

export const lineLineHeights: Record<OverlayLine['type'], string> = {
  header1: '1.25rem',
  header2: '1.25rem',
  header3: '1.25rem',
  subtext: '1.25rem',
  blockquote: '1.25rem',
  listItem: '1.25rem',
  orderedListItem: '1.25rem',
  codeBlockDelimiter: '1.25rem',
  codeBlockLine: '1.25rem',
  normal: '1.25rem',
};

export function getLineTypeAtCursor(content: string, cursorPos: number): OverlayLine['type'] {
  if (!content) return 'normal';
  const textBefore = content.slice(0, cursorPos);
  const lastNewline = textBefore.lastIndexOf('\n');
  const currentLine = content.slice(lastNewline + 1).split('\n')[0];

  // Check if cursor is inside a code block
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
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words box-border text-sm ${
          compact ? 'py-1 pr-2 min-h-[24px]' : 'py-3 pr-1 min-h-[24px]'
        }`}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            className={`${lineStyles[line.type]} ${lineHeightStyles[line.type]} relative`}
          >
            {line.text || '\u200B'}
          </div>
        ))}
      </div>
    );
  }
);

InputMarkdownOverlay.displayName = 'InputMarkdownOverlay';
