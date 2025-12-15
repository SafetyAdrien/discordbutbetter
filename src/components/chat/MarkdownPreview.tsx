import { parseMarkdown } from '@/lib/markdown';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  if (!content.trim()) return null;
  
  return (
    <div className={`bg-[#1e1f22] border border-border/50 rounded-md p-3 text-sm ${className}`}>
      <div className="text-xs text-[#949BA4] mb-2 font-medium flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        Aperçu Markdown
      </div>
      <div className="text-foreground markdown-preview">
        {parseMarkdown(content)}
      </div>
    </div>
  );
}
