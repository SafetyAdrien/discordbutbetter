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
  header1: 'font-bold text-foreground',
  header2: 'font-bold text-foreground',
  header3: 'font-semibold text-foreground',
  subtext: 'text-muted-foreground',
  normal: 'text-foreground',
};

export function InputMarkdownOverlay({ content, compact = false }: InputMarkdownOverlayProps) {
  const lines = useMemo(() => parseLines(content), [content]);

  return (
    <div
      aria-hidden
      className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden ${
        compact ? 'py-1 text-sm' : 'py-3 text-sm'
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
