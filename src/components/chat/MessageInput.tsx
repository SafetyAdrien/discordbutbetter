import { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { MarkdownPreview } from './MarkdownPreview';
import { MentionAutocomplete, MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';
import { normalizeForSearch } from '@/lib/utils';
import { PlusCircle, Image, BarChart2, Sticker, Smile, Send, Eye, EyeOff } from 'lucide-react';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  isSending?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  compact?: boolean;
  serverId?: string | null;
  channelId?: string | null;
  threadId?: string | null;
  // Mention autocomplete data
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
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
  threadId = null,
  members = [],
  roles = [],
  channels = [],
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

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

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = compact ? 120 : 200;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }, [compact]);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Ctrl+P keyboard shortcut for markdown preview toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  }, [value, disabled, onSend, mentionState, getSuggestionsCount, mentionSelectedIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSend();
    }
  };

  return (
    <div className={compact ? "p-3 border-t border-white/10" : "px-4 py-3 flex-shrink-0 flex flex-col w-full"}>
      {showPreview && value.trim() && (
        <MarkdownPreview content={value} className="mb-2 max-h-[150px] overflow-y-auto scrollbar-thin" />
      )}
      <form onSubmit={handleSubmit} className="relative w-full shadow-[0_-8px_15px_-10px_hsl(var(--background)/0.5)]">
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
          />
        )}
        
        <div className={`flex items-center gap-2 rounded-lg border transition-colors ${
          compact 
            ? "bg-[hsl(var(--input))] border-transparent" 
            : "bg-[hsl(var(--input))] border-border/50 focus-within:border-primary/50"
        }`}>
          <Popover open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`text-muted-foreground hover:text-foreground transition-colors ${compact ? 'p-2' : 'p-3'}`}
              >
                <PlusCircle className={compact ? "w-4 h-4" : "w-5 h-5"} />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-48 p-1">
              <button
                type="button"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                onClick={() => setPlusMenuOpen(false)}
              >
                <Image className="w-4 h-4" />
                <span>Ajouter une image</span>
              </button>
              {(channelId || threadId) && (
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
            </PopoverContent>
          </Popover>
          
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`flex-1 bg-transparent text-foreground placeholder:text-muted-foreground placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap focus:outline-none resize-none overflow-y-auto ${
              compact 
                ? "py-1 text-sm min-h-[24px] max-h-[120px] pr-2" 
                : "py-3 min-h-[24px] max-h-[200px] pr-3"
            }`}
            rows={1}
          />
          
          <div className={`flex items-center gap-1 ${compact ? 'pr-1' : 'pr-2'}`}>
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={insertEmoji}
              defaultTab="sticker"
              trigger={
                <button
                  type="button"
                  className={`text-muted-foreground hover:text-foreground transition-colors ${compact ? 'p-1.5' : 'p-2'}`}
                >
                  <Sticker className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </button>
              }
            />
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={insertEmoji}
              defaultTab="emoji"
              trigger={
                <button
                  type="button"
                  className={`text-muted-foreground hover:text-foreground transition-colors ${compact ? 'p-1.5' : 'p-2'}`}
                >
                  <Smile className={compact ? "w-4 h-4" : "w-5 h-5"} />
                </button>
              }
            />
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className={`text-muted-foreground hover:text-foreground transition-colors ${compact ? 'p-1.5' : 'p-2'} ${showPreview ? 'text-primary' : ''}`}
              title={showPreview ? "Masquer l'aperçu (Ctrl+P)" : "Aperçu Markdown (Ctrl+P)"}
            >
              {showPreview ? <EyeOff className={compact ? "w-4 h-4" : "w-5 h-5"} /> : <Eye className={compact ? "w-4 h-4" : "w-5 h-5"} />}
            </button>
            {value.trim() && (
              <button 
                type="submit" 
                disabled={disabled}
                className={`ml-1 p-1.5 rounded transition-colors hover:bg-muted send-button-hover ${isSending ? 'animate-send-fly' : ''}`}
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
