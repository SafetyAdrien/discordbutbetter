import { useRef, useState, useCallback } from 'react';
import { ImagePlus, Paperclip, Smile, Send, ChevronDown, X, MessageSquareText, Megaphone, FileText, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { AttachmentStagingArea } from '@/components/chat/upload/AttachmentStagingArea';
import { usePendingAttachments, PendingAttachment } from '@/hooks/usePendingAttachments';
import { useSendMessage } from '@/hooks/useMessages';
import { usePublishMessage, useChannelFollowers } from '@/hooks/useChannelFollowers';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnnouncementComposerProps {
  channelId: string;
  channelName: string;
  serverId: string | null;
  serverName: string;
  serverIcon?: string | null;
  canSendMessages: boolean;
  canAttachFiles: boolean;
  canPublishMessages: boolean;
  canCreateThreads: boolean;
  permissionDeniedMessage?: string;
  onFollowClick?: () => void;
  showFollowBar?: boolean;
  onMessageSent?: (messageId: string, title: string) => void;
  onTypingStart?: () => void;
}

export function AnnouncementComposer({
  channelId,
  channelName,
  serverId,
  serverName,
  serverIcon,
  canSendMessages,
  canAttachFiles,
  canPublishMessages,
  canCreateThreads,
  permissionDeniedMessage,
  onFollowClick,
  showFollowBar,
  onMessageSent,
  onTypingStart,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [headerImage, setHeaderImage] = useState<PendingAttachment | null>(null);
  const [autoCreateThread, setAutoCreateThread] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);
  const [sendOptionsOpen, setSendOptionsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    attachments,
    addFiles,
    removeAttachment,
    updateAttachment,
    toggleSpoiler,
    clearAttachments,
    isDragging,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = usePendingAttachments();

  const sendMessage = useSendMessage();
  const publishMessage = usePublishMessage();
  const { data: followers = [] } = useChannelFollowers(channelId);

  const disabled = !canSendMessages || isSending;
  const hasContent = title.trim().length > 0 || content.trim().length > 0 || attachments.length > 0 || !!headerImage;

  const handleHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    if (headerImage) URL.revokeObjectURL(headerImage.previewUrl);
    setHeaderImage({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      description: '',
      isSpoiler: false,
    });
    e.target.value = '';
  };

  const handleRemoveHeader = () => {
    if (headerImage) URL.revokeObjectURL(headerImage.previewUrl);
    setHeaderImage(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = '';
  };

  const handleEmojiSelect = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + emoji);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + emoji + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const handleStickerSelect = (stickerUrl: string, stickerName: string) => {
    // Treat sticker as GIF/image attachment by fetching it
    fetch(stickerUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `${stickerName}.gif`, { type: blob.type || 'image/gif' });
        addFiles([file]);
      })
      .catch(() => toast.error("Impossible d'ajouter cet élément"));
  };

  const reset = useCallback(() => {
    setTitle('');
    setContent('');
    if (headerImage) URL.revokeObjectURL(headerImage.previewUrl);
    setHeaderImage(null);
    clearAttachments();
  }, [headerImage, clearAttachments]);

  const handleSend = async () => {
    if (disabled || !hasContent) return;

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    const fullContent = trimmedTitle
      ? `# ${trimmedTitle}${trimmedContent ? `\n${trimmedContent}` : ''}`
      : trimmedContent;

    const allAttachments: PendingAttachment[] = headerImage ? [headerImage, ...attachments] : attachments;

    setIsSending(true);
    try {
      const result = await sendMessage.mutateAsync({
        channelId,
        content: fullContent || ' ',
        attachments: allAttachments,
      });

      const messageId = (result as any)?.id;

      // Auto-publish if requested
      if (autoPublish && messageId) {
        if (followers.length === 0) {
          toast.info("Aucun salon ne suit ce canal pour le moment");
        } else if (serverId) {
          try {
            await publishMessage.mutateAsync({
              messageId,
              channelId,
              content: fullContent,
              sourceServerId: serverId,
              sourceServerName: serverName,
              sourceServerIcon: serverIcon || null,
              sourceChannelName: channelName,
            });
          } catch (err) {
            // toast already shown by hook
          }
        }
      }

      // Notify parent for thread creation
      if (autoCreateThread && messageId) {
        onMessageSent?.(messageId, trimmedTitle || channelName);
      }

      reset();
    } catch (err) {
      // toast already handled by hook
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  // Permission-denied / follow bar
  if (showFollowBar && permissionDeniedMessage) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Megaphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground truncate">{permissionDeniedMessage}</p>
        </div>
        <Button size="sm" onClick={onFollowClick} className="flex-shrink-0">
          Suivre
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-surface transition-colors',
        isDragging ? 'border-primary' : 'border-border/60',
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header image preview */}
      <div className="px-4 pt-4">
        {headerImage ? (
          <div className="relative inline-block group">
            <img
              src={headerImage.previewUrl}
              alt="Header"
              className="w-16 h-16 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveHeader}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Retirer l'image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => headerInputRef.current?.click()}
                disabled={disabled || !canAttachFiles}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Ajouter une image d'en-tête"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Image d'en-tête</TooltipContent>
          </Tooltip>
        )}
        <input
          ref={headerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleHeaderImageSelect}
        />
      </div>

      {/* Title */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <Hash className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            onTypingStart?.();
          }}
          placeholder="Titre"
          disabled={disabled}
          maxLength={120}
          className="border-0 bg-transparent !text-lg font-bold p-0 h-auto focus-visible:ring-0"
        />
      </div>

      {/* Content textarea */}
      <div className="px-4 pt-2 pb-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            onTypingStart?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message d'envoi."
          disabled={disabled}
          maxLength={4000}
          className="min-h-[80px] max-h-[300px] border-0 bg-transparent p-0 resize-none focus-visible:ring-0 text-sm"
        />
      </div>

      {/* Attachment list (PDF / files / GIFs added) */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2">
          <AttachmentStagingArea
            attachments={attachments}
            onRemove={removeAttachment}
            onUpdate={updateAttachment}
            onToggleSpoiler={toggleSpoiler}
          />
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40">
        <div className="flex items-center gap-1">
          {/* File / PDF */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || !canAttachFiles}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Joindre un fichier"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Fichier ou PDF</TooltipContent>
          </Tooltip>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* GIF picker (uses sticker tab as proxy) */}
          <EmojiStickerPicker
            serverId={serverId}
            defaultTab="sticker"
            onEmojiSelect={handleEmojiSelect}
            onStickerSelect={handleStickerSelect}
            trigger={
              <button
                type="button"
                disabled={disabled}
                className="px-2 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Ajouter un GIF"
              >
                GIF
              </button>
            }
          />

          {/* Emoji */}
          <EmojiStickerPicker
            serverId={serverId}
            defaultTab="emoji"
            onEmojiSelect={handleEmojiSelect}
            onStickerSelect={handleStickerSelect}
            trigger={
              <button
                type="button"
                disabled={disabled}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            }
          />
        </div>

        {/* Send split button */}
        <div className="flex items-center">
          <Popover open={sendOptionsOpen} onOpenChange={setSendOptionsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="px-2 h-9 rounded-l-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
                aria-label="Options d'envoi"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-64 p-2 bg-popover border border-border/60"
            >
              <div className="text-[11px] font-semibold uppercase text-muted-foreground px-2 py-1.5">
                Options d'envoi
              </div>
              <label
                className={cn(
                  'flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-surface-hover cursor-pointer',
                  !canCreateThreads && 'opacity-50 cursor-not-allowed pointer-events-none',
                )}
              >
                <Checkbox
                  checked={autoCreateThread}
                  onCheckedChange={(v) => setAutoCreateThread(v === true)}
                  disabled={!canCreateThreads}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MessageSquareText className="w-3.5 h-3.5" />
                    Créer un thread
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ouvre un fil de discussion sous le message
                  </p>
                </div>
              </label>
              <label
                className={cn(
                  'flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-surface-hover cursor-pointer',
                  !canPublishMessages && 'opacity-50 cursor-not-allowed pointer-events-none',
                )}
              >
                <Checkbox
                  checked={autoPublish}
                  onCheckedChange={(v) => setAutoPublish(v === true)}
                  disabled={!canPublishMessages}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Megaphone className="w-3.5 h-3.5" />
                    Publier
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envoie aux {followers.length} salon{followers.length > 1 ? 's' : ''} abonné{followers.length > 1 ? 's' : ''}
                  </p>
                </div>
              </label>
            </PopoverContent>
          </Popover>
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !hasContent}
            className="h-9 px-4 rounded-r-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 border-l border-primary-foreground/20"
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">Envoyer</span>
          </button>
        </div>
      </div>

      {/* Active options badges */}
      {(autoCreateThread || autoPublish) && (
        <div className="flex items-center gap-1.5 px-4 pb-3 -mt-1 flex-wrap">
          {autoCreateThread && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              <MessageSquareText className="w-3 h-3" /> Thread
            </span>
          )}
          {autoPublish && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              <Megaphone className="w-3 h-3" /> Publication
            </span>
          )}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <FileText className="w-8 h-8 mx-auto text-primary mb-1" />
            <p className="text-sm font-medium text-primary">Déposer pour joindre</p>
          </div>
        </div>
      )}
    </div>
  );
}
