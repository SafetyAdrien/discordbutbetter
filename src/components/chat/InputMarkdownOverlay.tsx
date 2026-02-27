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
  header1: 'text-2xl font-bold text-foreground leading-[1.375]',
  header2: 'text-xl font-bold text-foreground leading-[1.375]',
  header3: 'text-lg font-semibold text-foreground leading-[1.375]',
  subtext: 'text-[12px] text-muted-foreground leading-4',
  normal: '',
};

export function InputMarkdownOverlay({ content, compact = false }: InputMarkdownOverlayProps) {
  const lines = useMemo(() => parseLines(content), [content]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none whitespace-pre-wrap break-words ${
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
