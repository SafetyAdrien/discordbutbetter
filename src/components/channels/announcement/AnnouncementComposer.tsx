import { useState, useRef, KeyboardEvent } from 'react';
import { Image as ImageIcon, Paperclip, Smile, Send, ChevronDown, MessageSquarePlus, Megaphone } from 'lucide-react';
import { Channel } from '@/types/app';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { EmojiStickerPicker } from '@/components/chat/EmojiStickerPicker';
import { AttachmentStagingArea } from '@/components/chat/upload/AttachmentStagingArea';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { useSendMessage } from '@/hooks/useMessages';
import { useCreateThread } from '@/hooks/useThreads';
import { usePublishMessage, useChannelFollowers } from '@/hooks/useChannelFollowers';
import { GifPicker } from './GifPicker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AnnouncementComposerProps {
  channel: Channel;
  serverName: string;
  serverIcon?: string;
  permissionDeniedMessage?: string;
  canAttachFiles: boolean;
  canCreateThreads: boolean;
  canPublish: boolean;
  showFollowBar?: boolean;
  onFollowClick?: () => void;
}

export function AnnouncementComposer({
  channel,
  serverName,
  serverIcon,
  permissionDeniedMessage,
  canAttachFiles,
  canCreateThreads,
  canPublish,
  showFollowBar,
  onFollowClick,
}: AnnouncementComposerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [createThreadEnabled, setCreateThreadEnabled] = useState(false);
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [threadName, setThreadName] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const createThread = useCreateThread();
  const publishMessage = usePublishMessage();
  const { data: followers = [] } = useChannelFollowers(channel.id);

  const isDisabled = !!permissionDeniedMessage || showFollowBar;
  const isSending = sendMessage.isPending;
  const canSubmit =
    !isDisabled &&
    !isSending &&
    (title.trim().length > 0 || message.trim().length > 0 || attachments.length > 0) &&
    (!createThreadEnabled || threadName.trim().length > 0);

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    setMessage((prev) => (prev.trim() ? `${prev.trim()}\n${gifUrl}` : gifUrl));
    textareaRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    const finalContent = trimmedTitle
      ? trimmedMessage
        ? `# ${trimmedTitle}\n\n${trimmedMessage}`
        : `# ${trimmedTitle}`
      : trimmedMessage;

    try {
      const result = await sendMessage.mutateAsync({
        channelId: channel.id,
        content: finalContent,
        attachments,
      });

      const newMessageId = (result as any)?.id;

      // Reset composer
      setTitle('');
      setMessage('');
      clearAttachments();

      // Create thread if enabled
      if (createThreadEnabled && threadName.trim() && newMessageId) {
        try {
          await createThread.mutateAsync({
            channelId: channel.id,
            name: threadName.trim(),
            messageId: newMessageId,
          });
        } catch (err) {
          console.error('Thread creation failed', err);
          toast.error('Impossible de créer le fil');
        }
        setThreadName('');
        setCreateThreadEnabled(false);
      }

      // Auto-publish if enabled
      if (autoPublishEnabled && newMessageId && followers.length > 0) {
        try {
          await publishMessage.mutateAsync({
            messageId: newMessageId,
            channelId: channel.id,
            content: finalContent,
            sourceServerId: channel.server_id,
            sourceServerName: serverName,
            sourceServerIcon: serverIcon ?? null,
            sourceChannelName: channel.name,
          });
        } catch (err) {
          console.error('Publish failed', err);
        }
      } else if (autoPublishEnabled && followers.length === 0) {
        toast.info('Aucun salon ne suit ce salon — rien à publier');
      }
    } catch (err) {
      console.error('Send failed', err);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (showFollowBar) {
    return (
      <button
        type="button"
        onClick={onFollowClick}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-input text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Megaphone className="w-4 h-4" />
        Suivre #{channel.name} pour recevoir les annonces
      </button>
    );
  }

  if (permissionDeniedMessage) {
    return (
      <div className="w-full px-4 py-3 rounded-2xl bg-input text-sm text-muted-foreground text-center">
        {permissionDeniedMessage}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl bg-input shadow-md overflow-hidden transition-all',
        isDragging && 'ring-2 ring-primary'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm pointer-events-none">
          <p className="text-sm font-medium text-primary">Déposer pour joindre</p>
        </div>
      )}

      {/* Attach image button + inputs */}
      <div className="flex items-start gap-3 p-3 pb-2">
        {canAttachFiles && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title="Ajouter une image"
          >
            <ImageIcon className="w-5 h-5" strokeWidth={1.75} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (optionnel)"
            className="w-full bg-transparent border-0 outline-none text-base font-bold text-foreground placeholder:text-muted-foreground/70 px-0 py-1"
            maxLength={200}
          />
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            className="min-h-[44px] max-h-[280px] resize-none bg-transparent border-0 px-0 py-1 text-sm placeholder:text-muted-foreground/70"
            rows={1}
          />
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="px-3 pb-2">
          <AttachmentStagingArea
            attachments={attachments}
            onToggleSpoiler={toggleSpoiler}
            onRemove={removeAttachment}
            onUpdate={updateAttachment}
          />
        </div>
      )}

      {/* Thread name input — only shown when toggle enabled */}
      {createThreadEnabled && (
        <div className="px-3 pb-2 flex items-center gap-2">
          <MessageSquarePlus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={threadName}
            onChange={(e) => setThreadName(e.target.value)}
            placeholder="Nom du fil de discussion"
            className="h-8 bg-background/50 border-0"
            maxLength={100}
          />
        </div>
      )}

      {/* Footer action bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40">
        <div className="flex items-center gap-1">
          {canAttachFiles && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                title="Joindre un fichier (image, vidéo, PDF)"
              >
                <Paperclip className="w-[18px] h-[18px]" />
              </button>

              <GifPicker
                onSelect={handleGifSelect}
                trigger={
                  <button
                    type="button"
                    className="h-8 px-2 rounded-md flex items-center justify-center text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                    title="Ajouter un GIF"
                  >
                    GIF
                  </button>
                }
              />
            </>
          )}

          <EmojiStickerPicker
            serverId={channel.server_id}
            onEmojiSelect={handleEmojiSelect}
            trigger={
              <button
                type="button"
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                title="Emoji"
              >
                <Smile className="w-[18px] h-[18px]" />
              </button>
            }
          />
        </div>

        {/* Right: Send + options dropdown */}
        <div className="flex items-stretch rounded-md overflow-hidden">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="h-8 px-4 rounded-r-none gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Envoyer
          </Button>
          {(canCreateThreads || canPublish) && (
            <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  className="h-8 px-2 rounded-l-none border-l border-primary-foreground/20"
                  disabled={isDisabled}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="top"
                className="w-72 p-2 bg-popover border border-border"
              >
                {canCreateThreads && (
                  <label className="flex items-start gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <Switch
                      checked={createThreadEnabled}
                      onCheckedChange={setCreateThreadEnabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">Créer un fil</div>
                      <div className="text-xs text-muted-foreground">
                        Ouvre automatiquement un fil sous l'annonce.
                      </div>
                    </div>
                  </label>
                )}
                {canPublish && (
                  <label className="flex items-start gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                    <Switch
                      checked={autoPublishEnabled}
                      onCheckedChange={setAutoPublishEnabled}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">Publier automatiquement</div>
                      <div className="text-xs text-muted-foreground">
                        Diffuse vers les {followers.length} salon{followers.length > 1 ? 's' : ''} qui suivent ce salon.
                      </div>
                    </div>
                  </label>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
