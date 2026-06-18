import { useRef } from 'react';
import {
  InputMarkdownOverlay,
  OVERLAY_FONT_SIZE,
  OVERLAY_LINE_HEIGHT,
  INPUT_FONT_FAMILY,
} from '@/components/chat/InputMarkdownOverlay';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  id?: string;
}

/**
 * Bio textarea with live Markdown rendering (chat-style overlay).
 * Identical font metrics between overlay and textarea keep the caret aligned.
 */
export function MarkdownLiveTextarea({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 6,
  className,
  id,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = value.length > 0;

  return (
    <div className={cn('relative w-full', className)}>
      {hasContent && (
        <InputMarkdownOverlay
          ref={overlayRef}
          content={value}
          className="py-3 px-3 border border-transparent rounded-xl"
        />
      )}
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => {
          const v = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
          onChange(v);
        }}
        onScroll={() => {
          if (overlayRef.current && textareaRef.current) {
            overlayRef.current.scrollTop = textareaRef.current.scrollTop;
          }
        }}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={cn(
          'block w-full rounded-xl border border-input bg-background px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto whitespace-pre-wrap break-words',
          hasContent ? 'text-transparent caret-foreground' : 'text-foreground',
        )}
        style={{
          fontSize: OVERLAY_FONT_SIZE,
          lineHeight: OVERLAY_LINE_HEIGHT,
          fontFamily: INPUT_FONT_FAMILY,
          fontWeight: 400,
          minHeight: `calc(${rows} * ${OVERLAY_LINE_HEIGHT} + 1.5rem)`,
        }}
      />
    </div>
  );
}
