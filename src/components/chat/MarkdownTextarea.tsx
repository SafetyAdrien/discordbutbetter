import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import {
  InputMarkdownOverlay,
  hasOverlayMarkdown,
  OVERLAY_FONT_SIZE,
  OVERLAY_LINE_HEIGHT,
  INPUT_FONT_FAMILY,
} from './InputMarkdownOverlay';
import { cn } from '@/lib/utils';

type NativeProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'defaultValue' | 'onChange'
>;

export interface MarkdownTextareaProps extends NativeProps {
  value: string;
  onChange: (value: string) => void;
  /** Extra wrapper class (positioning, sizing). */
  wrapperClassName?: string;
  /** Overlay extra class — typically matches the textarea's padding. */
  overlayClassName?: string;
  /** Suppress the live overlay even when content is non-empty. */
  disableOverlay?: boolean;
}

/**
 * Generic Markdown textarea — wraps a native <textarea> with the live
 * InputMarkdownOverlay used in MessageInput. Forwards the underlying
 * <textarea> ref so callers can keep auto-resize / focus logic intact.
 *
 * Font metrics on the textarea are forced to match the overlay so the
 * caret stays aligned. Callers pass the rest of the styling through
 * `className` (background, border, padding, min-height, …).
 */
export const MarkdownTextarea = forwardRef<HTMLTextAreaElement, MarkdownTextareaProps>(
  (
    {
      value,
      onChange,
      onScroll,
      className,
      style,
      wrapperClassName,
      overlayClassName,
      disableOverlay,
      ...rest
    },
    ref,
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement, []);

    const showOverlay = !disableOverlay && hasOverlayMarkdown(value);

    return (
      <div className={cn('relative w-full min-w-0', wrapperClassName)}>
        {showOverlay && (
          <InputMarkdownOverlay
            ref={overlayRef}
            content={value}
            className={cn('absolute inset-0 pointer-events-none px-3 py-2 overflow-y-auto', overlayClassName)}
          />
        )}
        <textarea
          {...rest}
          ref={innerRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (overlayRef.current && innerRef.current) {
              overlayRef.current.scrollTop = innerRef.current.scrollTop;
            }
            onScroll?.(e);
          }}
          className={cn(
            // Sensible defaults aligned with the shadcn <Textarea>; callers can override.
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'relative z-10 resize-none whitespace-pre-wrap break-words appearance-none',
            'placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0',
            showOverlay ? 'text-transparent caret-foreground' : 'text-foreground',
            className,
          )}
          style={{
            fontSize: OVERLAY_FONT_SIZE,
            lineHeight: OVERLAY_LINE_HEIGHT,
            fontFamily: INPUT_FONT_FAMILY,
            fontWeight: 400,
            fontSynthesis: 'none',
            letterSpacing: 'normal',
            ...style,
          }}
        />
      </div>
    );
  },
);
MarkdownTextarea.displayName = 'MarkdownTextarea';
