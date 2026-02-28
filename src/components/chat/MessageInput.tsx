import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { InputMarkdownOverlay, OVERLAY_FONT_SIZE, OVERLAY_LINE_HEIGHT, INPUT_FONT_FAMILY } from './InputMarkdownOverlay';
import { MentionAutocomplete, MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';
import { AttachmentStagingArea } from './upload/AttachmentStagingArea';
import { PendingAttachment } from '@/hooks/usePendingAttachments';
import { normalizeForSearch } from '@/lib/utils';
import { PlusCircle, Image, BarChart2, Sticker, Smile, Send } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

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
  showFollowBar = false,
  onFollowClick,
}: MessageInputProps) {
  const { isMobile } = useBreakpoint();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const hasMarkdown = useMemo(() => /^(#{1,3} |-# |> |>>> |\d+\. |[-*] |```)/m.test(value), [value]);

  // Adjust textarea height and reset overlay scroll position
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const DESKTOP_MIN_HEIGHT = 40;
    const COMPACT_MIN_HEIGHT = 28;
    const DESKTOP_SINGLE_LINE_TOLERANCE = 6;
    const minH = compact ? COMPACT_MIN_HEIGHT : DESKTOP_MIN_HEIGHT;
    textarea.style.height = 'auto';
    const sh = textarea.scrollHeight;
    // For desktop single-line: clamp to baseline if scrollHeight is within tolerance (handles 43-46px browser variance)
    const height = (!compact && sh <= DESKTOP_MIN_HEIGHT + DESKTOP_SINGLE_LINE_TOLERANCE) ? DESKTOP_MIN_HEIGHT : Math.max(sh, minH);
    textarea.style.height = height + 'px';
    // Reset overlay scroll sync when content changes
    if (overlayRef.current) {
      overlayRef.current.style.transform = `translateY(-${textarea.scrollTop}px)`;
    }
  }, [compact]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

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
    // Using lastIndexOf instead of regex to avoid alternation issues
    const hashIndex = beforeCursor.lastIndexOf('#');
    if (hashIndex !== -1) {
      const charBefore = hashIndex === 0 ? '' : beforeCursor[hashIndex - 1];
      // Only trigger if # is at start or after whitespace
      if (hashIndex === 0 || charBefore === ' ' || charBefore === '\n' || charBefore === '\t') {
        const afterHash = beforeCursor.slice(hashIndex + 1);
        // Accept any characters after # - MentionAutocomplete handles filtering with normalizeForSearch
        // This supports channel names with spaces, emojis, and special characters
        return {
          type: 'channel' as const,
          query: afterHash,
          startIndex: hashIndex,
          triggerLength: 1,
        };
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
  }, []);

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

  const handleMentionSelect = useCallback((mention: string, displayText: string) => {
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
        setMentionState(null);
        return;
      }
    }
    
    // Send message on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() || attachments.length > 0) {
        handleSendMessage();
      }
    }
  }, [value, mentionState, getSuggestionsCount, mentionSelectedIndex, attachments.length]);

  const handleSendMessage = useCallback(() => {
    if ((value.trim() || attachments.length > 0) && !disabled) {
      const attachmentData = attachments.map(a => ({
        file: a.file,
        name: a.name,
        description: a.description,
        isSpoiler: a.isSpoiler,
      }));
      onSend(attachmentData.length > 0 ? attachmentData : undefined);
      onClearAttachments?.();
    }
  }, [value, attachments, disabled, onSend, onClearAttachments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage();
  };

  // Handle paste to preserve markdown syntax
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard (preserves markdown syntax)
    const text = e.clipboardData.getData('text/plain');
    
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.slice(0, start) + text + value.slice(end);
      onChange(newValue);
      
      // Reposition cursor after pasted text
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + text.length;
      }, 0);
    }
  }, [value, onChange]);

  // Render follow bar for announcement channels when permission is denied
  if (permissionDeniedMessage && showFollowBar) {
    return (
      <div className={compact ? "p-3 border-t border-white/10 w-full relative" : "px-4 py-3 flex-shrink-0 flex flex-col w-full min-w-0 relative"}>
        <div className="flex items-center justify-between rounded-lg bg-[hsl(var(--input))] px-4 py-3">
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
      <div className={compact ? "p-3 border-t border-white/10 w-full relative" : "px-4 py-3 flex-shrink-0 flex flex-col w-full min-w-0 relative"}>
        <div className="flex items-center rounded-lg bg-[hsl(var(--input))] px-4 py-3">
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
      className={compact ? "p-3 border-t border-white/10 w-full relative" : `${isMobile ? "px-1.5 pt-0.5 pb-[calc(0.125rem+env(safe-area-inset-bottom,0px))]" : "px-4 py-3"} flex-shrink-0 flex flex-col w-full min-w-0 relative`}
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

      <form onSubmit={handleSubmit} className="relative w-full min-w-0 shadow-[0_-8px_15px_-10px_hsl(var(--background)/0.5)]">
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
        
        <div className={`flex items-stretch gap-2 ${isMobile ? 'rounded-2xl' : 'rounded-lg'} transition-colors w-full min-w-0 bg-[hsl(var(--input))]`}>
          <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`self-center text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center min-h-0 ${compact ? 'p-2' : 'h-10 w-10 p-0'}`}
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
          
          {/* Textarea container with markdown overlay */}
          <div className={`relative flex-1 min-w-0 overflow-hidden flex items-center`}>
            <InputMarkdownOverlay ref={overlayRef} content={value} compact={compact} />
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onScroll={() => {
                if (overlayRef.current && textareaRef.current) {
                  overlayRef.current.style.transform = `translateY(-${textareaRef.current.scrollTop}px)`;
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
              style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, letterSpacing: 'normal' }}
              className={`relative z-10 m-0 w-full rounded-none border-0 bg-transparent px-0 shadow-none appearance-none placeholder:text-muted-foreground placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap placeholder:opacity-30 focus:outline-none focus-visible:outline-none focus:ring-0 resize-none break-words box-border font-normal tracking-normal ${
                hasMarkdown ? 'text-transparent caret-foreground' : 'text-foreground'
              } ${
              compact 
                  ? `py-1 text-sm pr-2 min-h-[28px] max-h-[120px] overflow-y-auto` 
                  : `py-2.5 text-sm pr-1 min-h-[40px] max-h-[200px] overflow-y-auto`
              }`}
              rows={1}
            />
          </div>
          
          <div className={`self-center flex items-center gap-1 ${compact ? 'pr-1' : 'pr-2'}`}>
            {!isMobile && (
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={insertEmoji}
                defaultTab="sticker"
                trigger={
                  <button
                    type="button"
                    className={`text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center ${compact ? 'p-1.5' : 'h-10 w-10 p-0 min-h-0'}`}
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
                  className={`text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center ${compact ? 'p-1.5' : 'h-10 w-10 p-0 min-h-0'}`}
                >
                  <Smile className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </button>
              }
            />
            {(value.trim() || attachments.length > 0 || isMobile) && (
              <button 
                type="submit" 
                disabled={disabled || (!value.trim() && attachments.length === 0)}
                className={`ml-1 p-1.5 rounded transition-colors hover:bg-muted send-button-hover ${isSending ? 'animate-send-fly' : ''} ${!value.trim() && attachments.length === 0 ? 'opacity-30' : ''}`}
              >
                <Send className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} style={{ color: '#5865f2' }} />
              </button>
            )}
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
    </div>
  );
}
