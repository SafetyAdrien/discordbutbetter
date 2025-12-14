import { useState, useRef, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal } from './CreatePollModal';
import { PlusCircle, Image, BarChart2, Sticker, Smile, Send } from 'lucide-react';

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
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

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
    <div className={compact ? "p-3 border-t border-white/10" : "px-4 pb-6 flex-shrink-0"}>
      <form onSubmit={handleSubmit} className="relative shadow-[0_-8px_15px_-10px_hsl(var(--background)/0.5)]">
        <div className={`flex items-center gap-2 rounded-lg border transition-colors ${
          compact 
            ? "bg-[#383a40] border-transparent" 
            : "bg-input border-border focus-within:border-primary/50"
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
              {channelId && (
                <CreatePollModal
                  channelId={channelId}
                  serverId={serverId}
                  trigger={
                    <button
                      type="button"
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                      onClick={() => setPlusMenuOpen(false)}
                    >
                      <BarChart2 className="w-4 h-4" />
                      <span>Créer un sondage</span>
                    </button>
                  }
                />
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
    </div>
  );
}
