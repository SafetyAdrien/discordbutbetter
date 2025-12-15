import { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { MarkdownPreview } from './MarkdownPreview';
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
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    if (onTypingStart && onTypingStop) {
      onTypingStart();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop();
      }, 2000);
    }
  }, [onChange, onTypingStart, onTypingStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) {
        onSend();
      }
    }
  }, [value, disabled, onSend]);

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
            className={`flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none overflow-y-auto ${
              compact 
                ? "py-1 text-sm min-h-[24px] max-h-[120px]" 
                : "py-3 min-h-[24px] max-h-[200px]"
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
