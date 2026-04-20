import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { InputMarkdownOverlay, parseLines, hasInlineMarkdown, hasInlineMentions, OVERLAY_FONT_SIZE, OVERLAY_LINE_HEIGHT, INPUT_FONT_FAMILY } from './InputMarkdownOverlay';

import { MentionAutocomplete, MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';
import { AttachmentStagingArea } from './upload/AttachmentStagingArea';
import { PendingAttachment } from '@/hooks/usePendingAttachments';
import { normalizeForSearch } from '@/lib/utils';
import { PlusCircle, Image, BarChart2, Sticker, Smile, Send, ChevronLeft, ChevronRight, Bold, Italic, Underline, Strikethrough, Code, Quote, List, Link as LinkIcon, EyeOff, Heading1, Heading2, Heading3, Type, ListOrdered, TextQuote, SquareCode } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toast } from 'sonner';
import { MentionEveryoneWarningModal, EveryoneMentionType, detectEveryoneMention } from './MentionEveryoneWarningModal';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments?: { file: File; name: string; description: string; isSpoiler: boolean }[]) => void;
  placeholder: string;
  disabled?: boolean;
  isSending?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  compact?: boolean;
  serverId?: string | null;
  channelId?: string | null;
  channelName?: string;
  threadId?: string | null;
  // Mention autocomplete data
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
  // External attachment management (from ChatArea)
  attachments?: PendingAttachment[];
  onAddFiles?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onUpdateAttachment?: (id: string, updates: Partial<Pick<PendingAttachment, 'name' | 'description' | 'isSpoiler'>>) => void;
  onToggleSpoiler?: (id: string) => void;
  onClearAttachments?: () => void;
  // Permission denied message - shows disabled state when set
  permissionDeniedMessage?: string;
  // Additional permission flags
  canAttachFiles?: boolean;
  canCreatePolls?: boolean;
  canMentionEveryone?: boolean;
  // Slowmode
  slowmodeSeconds?: number;
  // Announcement channel follow bar
  showFollowBar?: boolean;
  onFollowClick?: () => void;
}

interface MentionState {
  type: 'user' | 'channel' | 'role';
  query: string;
  startIndex: number;
  triggerLength: number;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  placeholder,
  disabled = false,
  isSending = false,
  onTypingStart,
  onTypingStop,
  compact = false,
  serverId = null,
  channelId = null,
  channelName = 'général',
  threadId = null,
  members = [],
  roles = [],
  channels = [],
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
  onUpdateAttachment,
  onToggleSpoiler,
  onClearAttachments,
  permissionDeniedMessage,
  canAttachFiles = true,
  canCreatePolls = true,
  canMentionEveryone = true,
  slowmodeSeconds = 0,
  showFollowBar = false,
  onFollowClick,
}: MessageInputProps) {
  const { isMobile } = useBreakpoint();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const hasMarkdown = useMemo(() => {
    if (!value) return false;
    const lines = parseLines(value);
    return lines.some(l => l.type !== 'normal') || hasInlineMarkdown(value) || hasInlineMentions(value);
  }, [value]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [markdownBarOpen, setMarkdownBarOpen] = useState(false);
  const canSubmitMessage = !!value.trim() || attachments.length > 0;
  const markdownButtonClass = `shrink-0 text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center ${compact ? 'p-1' : 'p-1.5'}`;
  const rightActionsWidthClass = compact
    ? (isMobile ? 'w-[4.5rem]' : 'w-[6.75rem]')
    : (isMobile ? 'w-[4.75rem]' : 'w-[7.5rem]');

  const applyMarkdown = useCallback((prefix: string, suffix: string = prefix, isLinePrefix: boolean = false, blockWrap: boolean = false) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    let newValue: string;
    let newStart: number;
    let newEnd: number;

    if (blockWrap) {
      // Wrap selection in block delimiters with newlines: prefix\nselected\nsuffix
      const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
      const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');
      const lead = (needsLeadingNewline ? '\n' : '') + prefix + '\n';
      const trail = '\n' + suffix + (needsTrailingNewline ? '\n' : '');
      newValue = before + lead + selected + trail + after;
      newStart = start + lead.length;
      newEnd = newStart + selected.length;
    } else if (isLinePrefix) {
      // Find start of first line in selection
      const lineStart = before.lastIndexOf('\n') + 1;
      const segment = value.slice(lineStart, end);
      const prefixed = segment
        .split('\n')
        .map(l => (l.startsWith(prefix) ? l : prefix + l))
        .join('\n');
      newValue = value.slice(0, lineStart) + prefixed + after;
      newStart = lineStart;
      newEnd = lineStart + prefixed.length;
    } else if (selected.length > 0) {
      newValue = before + prefix + selected + suffix + after;
      newStart = start + prefix.length;
      newEnd = end + prefix.length;
    } else {
      newValue = before + prefix + suffix + after;
      newStart = start + prefix.length;
      newEnd = newStart;
    }

    onChange(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  }, [value, onChange]);

  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [lastSentAt, setLastSentAt] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Adjust textarea height and reset overlay scroll position
  // Uses a single 28px baseline matching the textarea's min-h-[28px] class
  // to prevent vertical jumps when toggling markdown content.
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const MIN_HEIGHT = 28;
    textarea.style.height = 'auto';
    const sh = textarea.scrollHeight;
    textarea.style.height = Math.max(sh, MIN_HEIGHT) + 'px';
    if (overlayRef.current) {
      overlayRef.current.scrollTop = textarea.scrollTop;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Discord-style auto-focus: when user starts typing anywhere on page,
  // route the keystroke into the message textarea.
  useEffect(() => {
    if (isMobile) return;
    if (disabled || permissionDeniedMessage) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Already focused on the textarea — let native handler work
      if (document.activeElement === textarea) return;

      // Skip if any modifier (shortcuts like Ctrl+K, Cmd+F, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Skip non-printable keys (arrows, F-keys, Escape, Tab, Enter, etc.)
      // Printable characters always have a single-char key value.
      if (e.key.length !== 1) return;

      // Skip if focus is on another editable element
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (active.isContentEditable) return;
      }

      // Skip if a modal/dialog/popover is open
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-popper-content-wrapper]')) {
        return;
      }

      // Skip if user is selecting text
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      // Focus the textarea — let the keystroke fall through naturally
      textarea.focus();
      // Move cursor to end
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isMobile, disabled, permissionDeniedMessage]);

  const insertEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      }, 0);
    } else {
      onChange(value + emoji);
    }
  }, [value, onChange]);



  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles?.(e.target.files);
      e.target.value = ''; // Reset input
    }
  }, [onAddFiles]);

  // Detect mention triggers - require space or start of line before trigger
  // Using non-capturing groups for browser compatibility (Safari, Firefox)
  const detectMentionTrigger = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    
    // Check for role mention (@& prefix) - non-capturing group for compatibility
    const roleMatch = beforeCursor.match(/(?:^|\s)(@&[\w\u00C0-\u024F]*)$/);
    if (roleMatch) {
      const fullMatch = roleMatch[1]; // "@&admin"
      const query = fullMatch.slice(2); // Remove @&
      const matchStart = beforeCursor.lastIndexOf(fullMatch);
      return {
        type: 'role' as const,
        query,
        startIndex: matchStart,
        triggerLength: 2,
      };
    }
    
    // Check for channel mention (# prefix) - explicit logic for full browser compatibility
    const hashIndex = beforeCursor.lastIndexOf('#');
    if (hashIndex !== -1) {
      const charBefore = hashIndex === 0 ? '' : beforeCursor[hashIndex - 1];
      // Only trigger if # is at start or after whitespace
      if (hashIndex === 0 || charBefore === ' ' || charBefore === '\n' || charBefore === '\t') {
        const afterHash = beforeCursor.slice(hashIndex + 1);
        // If space right after #, it's a Markdown heading — don't trigger channel autocomplete
        if (afterHash.length > 0 && afterHash[0] === ' ') {
          // Fall through to user mention check
        } else {
          // Quick check: ensure at least one channel matches the query
          const normalizedQuery = normalizeForSearch(afterHash);
          const hasMatch = afterHash.length === 0 || channels.some(c => normalizeForSearch(c.name).includes(normalizedQuery));
          if (hasMatch) {
            return {
              type: 'channel' as const,
              query: afterHash,
              startIndex: hashIndex,
              triggerLength: 1,
            };
          }
        }
      }
    }
    
    // Check for user mention (@ prefix, not followed by &) - non-capturing group for compatibility
    const userMatch = beforeCursor.match(/(?:^|\s)(@(?!&)[\w\u00C0-\u024F]*)$/);
    if (userMatch) {
      const fullMatch = userMatch[1]; // "@username"
      const query = fullMatch.slice(1); // Remove @
      const matchStart = beforeCursor.lastIndexOf(fullMatch);
      return {
        type: 'user' as const,
        query,
        startIndex: matchStart,
        triggerLength: 1,
      };
    }
    
    return null;
  }, [channels]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    // Detect mention triggers
    const mentionTrigger = detectMentionTrigger(newValue, cursorPos);
    if (mentionTrigger) {
      setMentionState(mentionTrigger);
      setMentionSelectedIndex(0);
    } else {
      setMentionState(null);
    }
    
    if (onTypingStart && onTypingStop) {
      onTypingStart();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000);
    }
  }, [onChange, onTypingStart, onTypingStop, detectMentionTrigger]);

  const sendAfterMentionRef = useRef(false);
  const handleSendMessageRef = useRef<(() => void) | null>(null);
  const handleMentionSelect = useCallback((mention: string, _displayText: string) => {
    if (!mentionState || !textareaRef.current) return;
    
    const before = value.slice(0, mentionState.startIndex);
    const after = value.slice(textareaRef.current.selectionStart);
    const newValue = before + mention + ' ' + after;
    
    onChange(newValue);
    setMentionState(null);
    
    // Set cursor position after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = mentionState.startIndex + mention.length + 1;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [mentionState, value, onChange]);

  // Get filtered suggestions count for keyboard navigation
  const getSuggestionsCount = useCallback(() => {
    if (!mentionState) return 0;
    const q = mentionState.query.toLowerCase();
    
    if (mentionState.type === 'user') {
      return members.filter(m => 
        m.displayName.toLowerCase().includes(q) || 
        m.username.toLowerCase().includes(q)
      ).slice(0, 10).length;
    }
    if (mentionState.type === 'role') {
      const special = ['everyone', 'here'].filter(r => r.includes(q)).length;
      const filtered = roles.filter(r => r.name.toLowerCase().includes(q)).slice(0, 8).length;
      return special + filtered;
    }
    if (mentionState.type === 'channel') {
      // Smart match using normalized search
      const normalizedQuery = normalizeForSearch(mentionState.query);
      return channels.filter(c => normalizeForSearch(c.name).includes(normalizedQuery)).slice(0, 10).length;
    }
    return 0;
  }, [mentionState, members, roles, channels]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention autocomplete navigation
    if (mentionState) {
      const count = getSuggestionsCount();
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev + 1) % count);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex(prev => (prev - 1 + count) % count);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && count > 0)) {
        e.preventDefault();
        // If Enter, flag to send after mention insertion
        if (e.key === 'Enter') {
          sendAfterMentionRef.current = true;
        } else {
          sendAfterMentionRef.current = false;
        }
        // Trigger selection of current item - handled by MentionAutocomplete
        const autocompleteContainer = document.querySelector('[data-mention-item]');
        if (autocompleteContainer) {
          const items = document.querySelectorAll('[data-mention-item]');
          (items[mentionSelectedIndex] as HTMLElement)?.click();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        sendAfterMentionRef.current = false;
        setMentionState(null);
        return;
      }
    }
    
    // On mobile: Enter inserts a newline, send via button only
    // On desktop: Enter sends, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      if (value.trim() || attachments.length > 0) {
        handleSendMessage();
      }
    }
  }, [value, mentionState, getSuggestionsCount, mentionSelectedIndex, attachments.length]);

  // Cooldown timer for slowmode
  useEffect(() => {
    if (slowmodeSeconds <= 0 || lastSentAt === 0) {
      setCooldownRemaining(0);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - lastSentAt) / 1000;
      const remaining = Math.max(0, slowmodeSeconds - elapsed);
      setCooldownRemaining(Math.ceil(remaining));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [slowmodeSeconds, lastSentAt]);

  const [pendingEveryoneMention, setPendingEveryoneMention] = useState<EveryoneMentionType | null>(null);

  const performSend = useCallback(() => {
    setLastSentAt(Date.now());
    const attachmentData = attachments.map(a => ({
      file: a.file,
      name: a.name,
      description: a.description,
      isSpoiler: a.isSpoiler,
    }));
    onSend(attachmentData.length > 0 ? attachmentData : undefined);
    onClearAttachments?.();
  }, [attachments, onSend, onClearAttachments]);

  const handleSendMessage = useCallback(() => {
    if ((value.trim() || attachments.length > 0) && !disabled) {
      // Slowmode check
      if (slowmodeSeconds > 0 && lastSentAt > 0) {
        const elapsed = (Date.now() - lastSentAt) / 1000;
        if (elapsed < slowmodeSeconds) {
          const remaining = Math.ceil(slowmodeSeconds - elapsed);
          toast.error(`Mode lent activé — attendez ${remaining}s`);
          return;
        }
      }

      // @everyone / @here warning — only if user has permission
      if (canMentionEveryone) {
        const mentionType = detectEveryoneMention(value);
        if (mentionType) {
          setPendingEveryoneMention(mentionType);
          return;
        }
      }

      performSend();
    }
  }, [value, attachments, disabled, performSend, slowmodeSeconds, lastSentAt, canMentionEveryone]);

  handleSendMessageRef.current = handleSendMessage;

  // After mention insertion + React re-render with new value, send if Enter was pressed
  useEffect(() => {
    if (sendAfterMentionRef.current) {
      sendAfterMentionRef.current = false;
      handleSendMessageRef.current?.();
    }
  }, [value]);

  const handleConfirmEveryone = useCallback(() => {
    setPendingEveryoneMention(null);
    performSend();
  }, [performSend]);

  const handleEditEveryone = useCallback(() => {
    setPendingEveryoneMention(null);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const len = textareaRef.current?.value.length ?? 0;
      textareaRef.current?.setSelectionRange(len, len);
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };


  // Handle paste: if text is selected and clipboard contains a URL, wrap as [text](url)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);

    // If there's a selection and the pasted content is a URL, create a masked link
    if (selectedText.length > 0 && /^https?:\/\/\S+$/.test(text.trim())) {
      const maskedLink = `[${selectedText}](${text.trim()})`;
      const newValue = value.slice(0, start) + maskedLink + value.slice(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + maskedLink.length;
      }, 0);
      return;
    }

    const newValue = value.slice(0, start) + text + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  }, [value, onChange]);

  const nonCompactPadding = isMobile
    ? "px-0 pt-0 pb-[calc(0.125rem+env(safe-area-inset-bottom,0px))]"
    : "px-0 py-0";
  const nonCompactContainerClass = `${nonCompactPadding} flex-shrink-0 flex flex-col w-full min-w-0 relative`;

  // Render follow bar for announcement channels when permission is denied
  if (permissionDeniedMessage && showFollowBar) {
    return (
      <div className={compact ? "p-3 border-t border-white/10 w-full relative" : nonCompactContainerClass}>
        <div className="flex items-center justify-between rounded-2xl bg-[hsl(var(--input))] border border-border/50 px-4 py-3" style={{ boxShadow: 'var(--shadow-elevation-2)' }}>
          <span className="text-muted-foreground text-sm">
            Suivez ce salon pour recevoir ses mises à jour sur votre propre serveur.
          </span>
          <Button 
            variant="secondary"
            size="sm"
            onClick={onFollowClick}
            className="ml-4 flex-shrink-0"
          >
            Suivre
          </Button>
        </div>
      </div>
    );
  }

  // Render disabled state when permission is denied (without follow bar)
  if (permissionDeniedMessage) {
    return (
      <div className={compact ? "p-3 border-t border-white/10 w-full relative" : nonCompactContainerClass}>
        <div className="flex items-center rounded-2xl bg-[hsl(var(--input))] border border-border/50 px-4 py-3" style={{ boxShadow: 'var(--shadow-elevation-2)' }}>
          <span className="text-muted-foreground/50 text-sm">
            {permissionDeniedMessage}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={compact ? "p-3 border-t border-white/10 w-full relative" : nonCompactContainerClass}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Attachment staging area */}
      <AttachmentStagingArea
        attachments={attachments}
        onToggleSpoiler={(id) => onToggleSpoiler?.(id)}
        onRemove={(id) => onRemoveAttachment?.(id)}
        onUpdate={(id, updates) => onUpdateAttachment?.(id, updates)}
      />

      <form onSubmit={handleSubmit} className="relative w-full min-w-0">
        {/* Mention Autocomplete */}
        {mentionState && (
          <MentionAutocomplete
            type={mentionState.type}
            query={mentionState.query}
            members={members}
            roles={roles}
            channels={channels}
            onSelect={handleMentionSelect}
            onClose={() => setMentionState(null)}
            selectedIndex={mentionSelectedIndex}
            onIndexChange={setMentionSelectedIndex}
            canMentionEveryone={canMentionEveryone}
          />
        )}
        
        <div className={`flex flex-col w-full min-w-0 rounded-2xl bg-[hsl(var(--input))] border border-border/50 transition-colors duration-200`} style={{ boxShadow: 'var(--shadow-elevation-2)' }}>
          {/* Textarea container - full width on top */}
          <div className={`relative w-full min-w-0 overflow-hidden ${compact ? 'px-3 pt-2 pb-1' : 'px-4 pt-3 pb-1'}`}>
            {hasMarkdown && (
              <InputMarkdownOverlay
                ref={overlayRef}
                content={value}
                compact={compact}
                className={`${compact ? 'px-3 pt-2 pb-1' : 'px-4 pt-3 pb-1'} min-h-[28px]`}
                mentionData={{ members, roles, channels }}
              />
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onScroll={() => { if (overlayRef.current && textareaRef.current) overlayRef.current.scrollTop = textareaRef.current.scrollTop; }}
              placeholder={placeholder}
              disabled={disabled}
              className={`relative z-10 m-0 w-full rounded-none border-0 bg-transparent px-0 py-0 shadow-none appearance-none placeholder:text-muted-foreground placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap placeholder:opacity-30 focus:outline-none focus-visible:outline-none focus:ring-0 resize-none break-words box-border font-normal tracking-normal text-sm min-h-[28px] ${
                hasMarkdown ? 'text-transparent caret-foreground' : 'text-foreground'
              } ${
                compact ? 'max-h-[120px] overflow-y-auto' : 'max-h-[200px] overflow-y-auto'
              }`}
              style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400 }}
              rows={1}
            />
          </div>

          {/* Action bar - bottom */}
          <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 border-t border-border/40 ${compact ? 'px-1.5 py-1' : 'px-2 py-1.5'}`}>
            <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`shrink-0 text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center min-h-0 ${compact ? 'p-1.5' : 'h-9 w-9 p-0'}`}
                >
                  <PlusCircle className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-48 p-1">
                {canAttachFiles && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Image className="w-4 h-4" />
                    <span>Ajouter une image</span>
                  </button>
                )}
                {(channelId || threadId) && canCreatePolls && (
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                    onClick={() => {
                      setPlusMenuOpen(false);
                      setPollModalOpen(true);
                    }}
                  >
                    <BarChart2 className="w-4 h-4" />
                    <span>Créer un sondage</span>
                  </button>
                )}
                {!canAttachFiles && !canCreatePolls && (
                  <span className="text-xs text-muted-foreground px-3 py-2 block">Aucune action disponible</span>
                )}
              </PopoverContent>
            </Popover>

            <div className="flex min-w-0 items-center overflow-hidden">
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setMarkdownBarOpen(o => !o)}
                title={markdownBarOpen ? 'Masquer le formatage' : 'Afficher le formatage'}
                className={`shrink-0 text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center ${compact ? 'p-1' : 'p-1.5'}`}
              >
                {markdownBarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <div className="ml-0.5 min-w-0 flex-1 overflow-hidden">
                <div
                  className={`flex items-center gap-0.5 whitespace-nowrap overflow-x-auto scrollbar-none transition-[opacity,transform] duration-200 ${markdownBarOpen ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 pointer-events-none'}`}
                  style={{ transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)' }}
                  aria-hidden={!markdownBarOpen}
                >
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Titre 1" onClick={() => applyMarkdown('# ', '', true)} className={markdownButtonClass}><Heading1 className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Titre 2" onClick={() => applyMarkdown('## ', '', true)} className={markdownButtonClass}><Heading2 className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Titre 3" onClick={() => applyMarkdown('### ', '', true)} className={markdownButtonClass}><Heading3 className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Texte discret" onClick={() => applyMarkdown('-# ', '', true)} className={markdownButtonClass}><Type className="w-4 h-4" /></button>
                  <div className="shrink-0 w-px h-4 bg-border/40 mx-1" />
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Gras" onClick={() => applyMarkdown('**')} className={markdownButtonClass}><Bold className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Italique" onClick={() => applyMarkdown('*')} className={markdownButtonClass}><Italic className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Souligné" onClick={() => applyMarkdown('__')} className={markdownButtonClass}><Underline className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Barré" onClick={() => applyMarkdown('~~')} className={markdownButtonClass}><Strikethrough className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Code en ligne" onClick={() => applyMarkdown('`')} className={markdownButtonClass}><Code className="w-4 h-4" /></button>
                  <div className="shrink-0 w-px h-4 bg-border/40 mx-1" />
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Bloc de code" onClick={() => applyMarkdown('```', '```', false, true)} className={markdownButtonClass}><SquareCode className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Citation" onClick={() => applyMarkdown('> ', '', true)} className={markdownButtonClass}><Quote className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Citation multi-ligne" onClick={() => applyMarkdown('>>> ', '', true)} className={markdownButtonClass}><TextQuote className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Liste à puces" onClick={() => applyMarkdown('- ', '', true)} className={markdownButtonClass}><List className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Liste numérotée" onClick={() => applyMarkdown('1. ', '', true)} className={markdownButtonClass}><ListOrdered className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Lien" onClick={() => applyMarkdown('[', '](url)')} className={markdownButtonClass}><LinkIcon className="w-4 h-4" /></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} title="Spoiler" onClick={() => applyMarkdown('||')} className={markdownButtonClass}><EyeOff className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-end gap-0.5 shrink-0 ${rightActionsWidthClass}`}>
              {!isMobile && (
                <EmojiStickerPicker
                  serverId={serverId}
                  onEmojiSelect={insertEmoji}
                  defaultTab="sticker"
                  trigger={
                    <button
                      type="button"
                      className={`text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center ${compact ? 'p-1.5' : 'h-9 w-9 p-0 min-h-0'}`}
                    >
                      <Sticker className={compact ? "w-4 h-4" : "w-5 h-5"} />
                    </button>
                  }
                />
              )}
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={insertEmoji}
                defaultTab="emoji"
                trigger={
                  <button
                    type="button"
                    className={`text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center ${compact ? 'p-1.5' : 'h-9 w-9 p-0 min-h-0'}`}
                  >
                    <Smile className={compact ? "w-4 h-4" : "w-5 h-5"} />
                  </button>
                }
              />
              <button
                type="submit"
                disabled={disabled || !canSubmitMessage}
                aria-label="Envoyer"
                className={`ml-0.5 shrink-0 p-2 rounded-full transition-all duration-200 send-button-hover ${isSending ? 'animate-send-fly' : ''} ${canSubmitMessage ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-elevation-1)]' : 'text-muted-foreground opacity-30 cursor-not-allowed'}`}
              >
                <Send className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
              </button>
            </div>
          </div>
        </div>
      </form>

      
      
      {(channelId || threadId) && (
        <CreatePollModal
          channelId={channelId || ''}
          serverId={serverId}
          threadId={threadId}
          open={pollModalOpen}
          onOpenChange={setPollModalOpen}
        />
      )}

      <MentionEveryoneWarningModal
        open={pendingEveryoneMention !== null}
        mentionType={pendingEveryoneMention ?? 'everyone'}
        onConfirm={handleConfirmEveryone}
        onEdit={handleEditEveryone}
      />
    </div>
  );
}
