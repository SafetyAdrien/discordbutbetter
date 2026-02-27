import { useMemo } from 'react';

interface InputMarkdownOverlayProps {
  content: string;
  compact?: boolean;
}

interface OverlayLine {
  type: 'header1' | 'header2' | 'header3' | 'subtext' | 'normal';
  text: string;
}

function parseLines(content: string): OverlayLine[] {
  if (!content) return [{ type: 'normal', text: '' }];
  
  return content.split('\n').map(line => {
    if (line.startsWith('### ')) return { type: 'header3', text: line };
    if (line.startsWith('## ')) return { type: 'header2', text: line };
    if (line.startsWith('# ')) return { type: 'header1', text: line };
    if (line.startsWith('-# ')) return { type: 'subtext', text: line };
    return { type: 'normal', text: line };
  });
}

const lineStyles: Record<OverlayLine['type'], string> = {
  header1: 'text-2xl font-bold text-foreground leading-[2.25rem]',
  header2: 'text-xl font-bold text-foreground leading-[1.875rem]',
  header3: 'text-lg font-semibold text-foreground leading-[1.6875rem]',
  subtext: 'text-[12px] text-muted-foreground leading-[1.125rem]',
  normal: '',
};

// Map line type to fontSize values (used by MessageInput for caret sizing)
export const lineFontSizes: Record<OverlayLine['type'], string> = {
  header1: '1.5rem',
  header2: '1.25rem',
  header3: '1.125rem',
  subtext: '12px',
  normal: '0.875rem',
};

export const lineLineHeights: Record<OverlayLine['type'], string> = {
  header1: '2.25rem',
  header2: '1.875rem',
  header3: '1.6875rem',
  subtext: '1.125rem',
  normal: '1.25rem',
};

export function getLineTypeAtCursor(content: string, cursorPos: number): OverlayLine['type'] {
  if (!content) return 'normal';
  const textBefore = content.slice(0, cursorPos);
  const lastNewline = textBefore.lastIndexOf('\n');
  const currentLine = content.slice(lastNewline + 1).split('\n')[0];
  if (currentLine.startsWith('### ')) return 'header3';
  if (currentLine.startsWith('## ')) return 'header2';
  if (currentLine.startsWith('# ')) return 'header1';
  if (currentLine.startsWith('-# ')) return 'subtext';
  return 'normal';
}

export function InputMarkdownOverlay({ content, compact = false }: InputMarkdownOverlayProps) {
  const lines = useMemo(() => parseLines(content), [content]);

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words ${
        compact ? 'py-1 text-sm min-h-[24px]' : 'py-3 text-sm min-h-[24px]'
      }`}
    >
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && '\n'}
          {line.type !== 'normal' ? (
            <span className={lineStyles[line.type]}>{line.text}</span>
          ) : (
            <span className="text-transparent">{line.text}</span>
          )}
        </span>
      ))}
    </div>
  );
}
