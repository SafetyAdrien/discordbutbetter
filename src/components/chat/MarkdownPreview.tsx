import { parseMarkdown } from '@/lib/markdown';
import { hasInlineMarkdown, parseLines } from './InputMarkdownOverlay';
import { useMemo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

function hasMarkdownContent(content: string): boolean {
  if (!content?.trim()) return false;
  const lines = parseLines(content);
  return lines.some(l => l.type !== 'normal') || hasInlineMarkdown(content);
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const showPreview = useMemo(() => hasMarkdownContent(content), [content]);
  
  if (!showPreview) return null;
  
  return (
    <div className={`bg-[hsl(var(--card))] rounded-md p-2.5 text-sm ${className}`}>
      <div className="text-foreground markdown-preview">
        {parseMarkdown(content)}
      </div>
    </div>
  );
}
