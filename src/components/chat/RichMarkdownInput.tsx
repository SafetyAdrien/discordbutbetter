import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

interface RichMarkdownInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export interface RichMarkdownInputRef {
  focus: () => void;
  textarea: HTMLTextAreaElement | null;
  selectionStart: number;
  selectionEnd: number;
  setSelectionRange: (start: number, end: number) => void;
}

// Parse inline markdown and return React elements
function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const elements: React.ReactNode[] = [];
  let key = 0;

  // Pattern to match markdown syntax
  // Order matters: check longer patterns first
  const patterns = [
    // Code blocks (``` ... ```)
    { regex: /```([^`]*?)```/g, render: (match: string, content: string) => (
      <code key={key++} className="bg-[#2b2d31] px-1.5 py-0.5 rounded text-[#b5bac1] font-mono text-[0.875em] whitespace-pre-wrap block my-1">{content}</code>
    )},
    // Inline code (` ... `)
    { regex: /`([^`]+)`/g, render: (match: string, content: string) => (
      <code key={key++} className="bg-[#2b2d31] px-1 py-0.5 rounded text-[#b5bac1] font-mono text-[0.875em]">{content}</code>
    )},
    // Bold italic (***...*** or ___...___) 
    { regex: /\*\*\*([^*]+)\*\*\*/g, render: (match: string, content: string) => (
      <strong key={key++} className="font-bold"><em>{content}</em></strong>
    )},
    // Bold (**...** or __...__) 
    { regex: /\*\*([^*]+)\*\*/g, render: (match: string, content: string) => (
      <strong key={key++} className="font-bold">{content}</strong>
    )},
    { regex: /__([^_]+)__/g, render: (match: string, content: string) => (
      <strong key={key++} className="font-bold">{content}</strong>
    )},
    // Italic (*...* or _..._)
    { regex: /\*([^*]+)\*/g, render: (match: string, content: string) => (
      <em key={key++} className="italic">{content}</em>
    )},
    { regex: /_([^_]+)_/g, render: (match: string, content: string) => (
      <em key={key++} className="italic">{content}</em>
    )},
    // Strikethrough (~~...~~)
    { regex: /~~([^~]+)~~/g, render: (match: string, content: string) => (
      <del key={key++} className="line-through">{content}</del>
    )},
    // Underline (Discord uses __)
    // Spoiler (||...||)
    { regex: /\|\|([^|]+)\|\|/g, render: (match: string, content: string) => (
      <span key={key++} className="bg-[#3c3c3c] text-[#3c3c3c] hover:bg-transparent hover:text-inherit rounded px-0.5 transition-colors cursor-pointer">{content}</span>
    )},
    // Headers (# ## ### etc at start of line)
    { regex: /^(#{1,3})\s+(.+)$/gm, render: (match: string, hashes: string, content: string) => {
      const level = hashes.length;
      const className = level === 1 ? 'text-xl font-bold' : level === 2 ? 'text-lg font-bold' : 'text-base font-semibold';
      return <span key={key++} className={className}>{content}</span>;
    }},
    // Blockquote (> at start of line)
    { regex: /^>\s+(.+)$/gm, render: (match: string, content: string) => (
      <span key={key++} className="border-l-4 border-[#4e5058] pl-2 text-[#b5bac1] block">{content}</span>
    )},
    // Links [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (match: string, text: string, url: string) => (
      <span key={key++} className="text-[#00a8fc] hover:underline cursor-pointer">{text}</span>
    )},
  ];

  // Process the text with each pattern
  let processedText = text;
  const replacements: { start: number; end: number; element: React.ReactNode }[] = [];

  for (const pattern of patterns) {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      const element = pattern.render(match[0], match[1], match[2] as string);
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        element
      });
    }
  }

  // Sort replacements by start position
  replacements.sort((a, b) => a.start - b.start);

  // Remove overlapping replacements (keep first)
  const finalReplacements: typeof replacements = [];
  let lastEnd = 0;
  for (const rep of replacements) {
    if (rep.start >= lastEnd) {
      finalReplacements.push(rep);
      lastEnd = rep.end;
    }
  }

  // Build the result
  let currentIndex = 0;
  for (const rep of finalReplacements) {
    if (rep.start > currentIndex) {
      elements.push(<span key={key++}>{text.slice(currentIndex, rep.start)}</span>);
    }
    elements.push(rep.element);
    currentIndex = rep.end;
  }
  if (currentIndex < text.length) {
    elements.push(<span key={key++}>{text.slice(currentIndex)}</span>);
  }

  return elements.length > 0 ? elements : [<span key={0}>{text}</span>];
}

export const RichMarkdownInput = forwardRef<RichMarkdownInputRef, RichMarkdownInputProps>(({
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  disabled = false,
  compact = false,
  className = '',
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    textarea: textareaRef.current,
    get selectionStart() {
      return textareaRef.current?.selectionStart ?? 0;
    },
    get selectionEnd() {
      return textareaRef.current?.selectionEnd ?? 0;
    },
    setSelectionRange: (start: number, end: number) => {
      textareaRef.current?.setSelectionRange(start, end);
    },
  }));

  // Adjust textarea height based on content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = compact ? 120 : 200;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [compact]);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  return (
    <div className={`relative flex-1 min-h-[24px] ${className}`}>
      {/* Overlay layer - displays formatted markdown */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden text-foreground ${compact ? 'text-sm' : 'text-[15px]'} leading-[1.375rem]`}
        style={{ 
          wordBreak: 'break-word',
          padding: '0',
        }}
        aria-hidden="true"
      >
        {value ? parseInlineMarkdown(value) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>

      {/* Invisible textarea for input capture */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onScroll={handleScroll}
        disabled={disabled}
        rows={1}
        className={`w-full resize-none bg-transparent text-transparent selection:bg-primary/30 selection:text-transparent caret-foreground outline-none placeholder-transparent ${compact ? 'text-sm py-2' : 'text-[15px] py-2.5'} leading-[1.375rem]`}
        style={{
          caretColor: 'hsl(var(--foreground))',
        }}
        placeholder=""
      />
    </div>
  );
});

RichMarkdownInput.displayName = 'RichMarkdownInput';
