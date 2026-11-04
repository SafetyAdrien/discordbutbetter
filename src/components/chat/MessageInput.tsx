import StreamlineThreads from '@/components/icons/StreamlineThreads';
import { IconApps } from '@/components/chat/message-menu/MessageMenuIcons';
import { createDiscordIcon } from '@/components/icons/discord/createDiscordIcon';
import { diFileUpload } from '@/components/icons/discord/discordIconData';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { CreatePollModal, type PollDraft } from './CreatePollModal';
import { CreateDMPollModal } from './CreateDMPollModal';
import { InputMarkdownOverlay, hasOverlayMarkdown, OVERLAY_FONT_SIZE, OVERLAY_LINE_HEIGHT, INPUT_FONT_FAMILY, MentionEntry } from './InputMarkdownOverlay';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { MentionAutocomplete, MentionMember, MentionRole, MentionChannel } from './MentionAutocomplete';
import { NAMED_COLORS, normalizeHex, nearestColorName } from '@/lib/colorNames';
import { AttachmentStagingArea } from './upload/AttachmentStagingArea';
import { PendingAttachment, type AttachmentMeta } from '@/hooks/usePendingAttachments';
import { LazyMediaUploadModal as MediaUploadModal } from '@/components/lazy/LazyModals';
import { ALL_MEDIA_KINDS, acceptFor } from '@/lib/mediaTypes';
import { ColorInsertPanel } from './ColorInsertPanel';
import { normalizeForSearch, cn } from '@/lib/utils';
import { BarChart2, Palette, Bold, Italic, Underline, Strikethrough, Code, Quote, Heading1, Heading2, Heading3, Type, ListOrdered, TextQuote, SquareCode, Lightbulb, MessageSquareWarning, TriangleAlert, OctagonAlert } from 'lucide-react';
import { ComposerPlus } from '@/components/icons/ComposerPlus';
import { Gift, Sticker, Image, Smile, Send, ChevronLeft, ChevronRight, List, Link as LinkIcon, EyeOff, Info } from '@/components/icons/discord/lucide';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { uuidToSnowflake } from '@/lib/snowflake';
import { emojiToken, lookupEmoji, resolveShortcodes } from '@/lib/customEmoji';
import { MENTION_USER_EVENT, type MentionUserDetail } from '@/lib/mentionEvents';
import { usePrefetchPickerAssets } from '@/hooks/useAllServerAssets';
import { MentionEveryoneWarningModal, EveryoneMentionType, detectEveryoneMention } from './MentionEveryoneWarningModal';
import { snowflakeToUuid } from '@/lib/snowflake';
import { useUserSettingsValue } from '@/hooks/useUserSettings';
import { SlashMenuLayer, SlashCommandRunner } from './slash/SlashLayers';
import { openNewThread } from '@/lib/threadEvents';
import type { SlashHandlers } from './slash/useSlashExecutor';
import type { SlashCommand } from '@/lib/slashCommands';


interface MessageInputProps {
  /** Entrees supplementaires du menu "+" (ex. "Annonce enrichie"). */
  extraPlusItems?: { key: string; label: string; icon: React.ElementType; onClick: () => void }[];
  value: string;
  onChange: (value: string) => void;
  onSend: (attachments?: { file: File; name: string; description: string; isSpoiler: boolean }[]) => void;
  // Sends a sticker or GIF immediately as its own message (no upload — direct URL).
  onSendExternalAttachment?: (attachment: { url: string; name: string; type: 'sticker' | 'gif' }) => void;
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
  /**
   * Id of the message currently being edited, or null. Drives the editing UI
   * (edit bar, Escape-to-cancel, restricted attachments). ChatArea owns the
   * state and swaps value/onChange/onSend accordingly.
   */
  editingMessageId?: string | null;
  // DM context : when set, the poll button opens a DM-poll modal
  dmConversationId?: string | null;
  // Mention autocomplete data
  members?: MentionMember[];
  roles?: MentionRole[];
  channels?: MentionChannel[];
  // External attachment management (from ChatArea)
  attachments?: PendingAttachment[];
  onAddFiles?: (files: FileList | File[], meta?: AttachmentMeta[]) => void;
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
  /** Creation d'un fil : le sondage est garde en brouillon au lieu d'etre envoye. */
  onDraftPoll?: (draft: PollDraft) => void;
  /** Commandes slash (menu "/", options, execution) : absent = desactivees. */
  slash?: SlashHandlers;
}

const DM_ACTION = 'flex h-8 w-[38px] items-center justify-center text-[hsl(var(--icon-default))] transition-colors hover:text-white';
const FileUploadGlyph = createDiscordIcon(diFileUpload, 'PlusFileUpload');
const PLUS_ITEM = 'flex h-[34px] whitespace-nowrap w-full items-center gap-3 rounded-[4px] px-2 text-left text-[14px] leading-[18px] font-medium text-white transition-colors hover:bg-[#464650]';
const plusSvg = { viewBox: '0 0 24 24', className: 'h-5 w-5 shrink-0 text-[#b5bac1]', fill: 'currentColor', 'aria-hidden': true } as const;
const PlusIconUpload = () => <FileUploadGlyph className="h-5 w-5 shrink-0 text-[#b5bac1]" />;
const PlusIconThread = () => <StreamlineThreads className="h-5 w-5 shrink-0 text-[#b5bac1]" />;
const PlusIconApps = () => <IconApps className="h-5 w-5 shrink-0 text-[#b5bac1]" />;
const PlusIconPoll = () => (<svg {...plusSvg}><rect x="3" y="4.5" width="13" height="3" rx="1.5" /><rect x="3" y="10.5" width="18" height="3" rx="1.5" /><rect x="3" y="16.5" width="10" height="3" rx="1.5" /></svg>);

interface MentionState {
  type: 'user' | 'channel' | 'color';
  query: string;
  startIndex: number;
  triggerLength: number;
}

export function MessageInput({
  extraPlusItems,
  value,
  onChange,
  onSend,
  editingMessageId = null,
  onSendExternalAttachment,
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
  dmConversationId = null,
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
  onDraftPoll,
  slash,
}: MessageInputProps) {
  const { isMobile, isTablet } = useBreakpoint();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);


  // Mention entries inserted via autocomplete (display text -> token mapping)
  const mentionEntriesRef = useRef<MentionEntry[]>([]);
  const [mentionRev, setMentionRev] = useState(0);
  // Emojis de serveur : charges des l'ouverture de la conversation, le selecteur s'ouvre sans attente.
  usePrefetchPickerAssets();

  // "Afficher un apercu des emojis, des mentions et de la syntaxe Markdown"
  const { markdown_preview: markdownPreview, send_button: alwaysShowSend } = useUserSettingsValue().appearance;
  const hasMarkdown = useMemo(() => {
    return markdownPreview && hasOverlayMarkdown(value, mentionEntriesRef.current);
  }, [value, mentionRev, markdownPreview]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [slashCommand, setSlashCommand] = useState<SlashCommand | null>(null);
  const pickSlashCommand = useCallback((cmd: SlashCommand) => {
    onChange('');
    setSlashCommand(cmd);
  }, [onChange]);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [plusMenuView, setPlusMenuView] = useState<'root' | 'color'>('root');
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [colorEditor, setColorEditor] = useState<{
    entryIndex: number;
    hex: string;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const [colorEditorDraft, setColorEditorDraft] = useState('');
  const cursorRafRef = useRef<number | null>(null);
  // Markdown formatting bar: collapsed by default on mobile/tablet to save horizontal space
  const [markdownBarOpen, setMarkdownBarOpen] = useState(!isMobile && !isTablet);
  const canSubmitMessage = !!value.trim() || attachments.length > 0;
  // Bigger touch targets on mobile/tablet (min 40x40 for accessibility)
  const markdownButtonClass = `shrink-0 text-muted-foreground hover:text-primary rounded-full transition-colors flex items-center justify-center ${
    compact ? 'p-1' : (isMobile || isTablet) ? 'p-2 min-w-[40px] min-h-[40px]' : 'p-1.5'
  }`;
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

  const insertAlert = useCallback((alertType: 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
    const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');
    const body = (selected || '').split('\n').map(l => `> ${l}`).join('\n') || '> ';
    const snippet = `${needsLeadingNewline ? '\n' : ''}> [!${alertType}]\n${body}${needsTrailingNewline ? '\n' : ''}`;
    const newValue = before + snippet + after;
    const caretBase = before.length + (needsLeadingNewline ? 1 : 0) + `> [!${alertType}]\n`.length;
    const newStart = caretBase + (selected ? 0 : 2); // after "> " when empty
    const newEnd = caretBase + body.length;
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
  // Uses a single 24px baseline matching the textarea's min-h-[24px] class
  // and its 24px line-height (a 28px floor left the text 2px above centre)
  // to prevent vertical jumps when toggling markdown content.
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const MIN_HEIGHT = 24;
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

  const insertEmoji = useCallback((emoji: string, custom?: { name: string; url: string }) => {
    const textarea = textareaRef.current;
    const token = custom ? emojiToken(custom) : null;
    if (custom && token && token.startsWith('<')) {
      // Emoji de serveur : une entree (affichee comme l'image, ecrite comme son jeton a l'envoi), rangee dans l'ordre du texte.
      const display = '\u2003\u2002';
      const at = textarea ? textarea.selectionStart : value.length;
      const end = textarea ? textarea.selectionEnd : value.length;
      const list = mentionEntriesRef.current;
      let cursor = 0;
      let idx = list.length;
      for (let i = 0; i < list.length; i++) {
        const pos = value.indexOf(list[i].display, cursor);
        if (pos === -1) continue;
        if (pos >= at) { idx = i; break; }
        cursor = pos + list[i].display.length;
      }
      mentionEntriesRef.current = [...list.slice(0, idx), { display, token, kind: 'emoji', url: custom.url }, ...list.slice(idx)];
      setMentionRev((r) => r + 1);
      onChange(value.slice(0, at) + display + value.slice(end));
      setTimeout(() => {
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = at + display.length;
          textarea.focus();
        }
      }, 0);
      return;
    }
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

  // "Mentionner" depuis le menu d'un membre : ajoute la mention au champ du salon ouvert.
  useEffect(() => {
    if (compact || threadId || dmConversationId) return;
    const onMention = (e: Event) => {
      const { userId, name } = (e as CustomEvent<MentionUserDetail>).detail ?? {};
      const root = containerRef.current;
      if (!userId || !root || root.offsetParent === null) return;
      const display = `@${name}`;
      const textarea = textareaRef.current;
      const at = textarea ? textarea.selectionStart : value.length;
      const end = textarea ? textarea.selectionEnd : value.length;
      const list = mentionEntriesRef.current;
      let cursor = 0;
      let idx = list.length;
      for (let i = 0; i < list.length; i++) {
        const pos = value.indexOf(list[i].display, cursor);
        if (pos === -1) continue;
        if (pos >= at) { idx = i; break; }
        cursor = pos + list[i].display.length;
      }
      mentionEntriesRef.current = [...list.slice(0, idx), { display, token: `<@${uuidToSnowflake(userId)}>`, kind: 'user' }, ...list.slice(idx)];
      setMentionRev((r) => r + 1);
      onChange(value.slice(0, at) + display + ' ' + value.slice(end));
      setTimeout(() => {
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = at + display.length + 1;
          textarea.focus();
        }
      }, 0);
    };
    window.addEventListener(MENTION_USER_EVENT, onMention);
    return () => window.removeEventListener(MENTION_USER_EVENT, onMention);
  }, [compact, threadId, dmConversationId, value, onChange]);

  const insertColor = useCallback((hex: string) => {
    const glyph = `\u25A0 ${nearestColorName(hex)}`;
    const textarea = textareaRef.current;
    const insertAt = textarea ? textarea.selectionStart : value.length;
    const insertEnd = textarea ? textarea.selectionEnd : value.length;
    const newValue = value.slice(0, insertAt) + glyph + value.slice(insertEnd);
    mentionEntriesRef.current = [
      ...mentionEntriesRef.current,
      { display: glyph, token: `<c:${hex}>`, kind: 'color', color: hex },
    ];
    setMentionRev(r => r + 1);
    onChange(newValue);
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = textarea.selectionEnd = insertAt + glyph.length;
        textarea.focus();
      }
    }, 0);
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

    // Compute "reserved" ranges occupied by confirmed mention entries within
    // beforeCursor. Any trigger char (#, @) that falls inside one of those
    // ranges must be ignored — it belongs to a mention that was already
    // inserted, not to a new autocomplete trigger.
    const reserved: Array<{ start: number; end: number }> = [];
    {
      let cursor = 0;
      for (const entry of mentionEntriesRef.current) {
        if (!entry.display) continue;
        const at = text.indexOf(entry.display, cursor);
        if (at === -1) continue;
        const end = at + entry.display.length;
        if (at < cursorPos) {
          reserved.push({ start: at, end: Math.min(end, cursorPos) });
        }
        cursor = end;
      }
    }
    const inReserved = (idx: number) => reserved.some(r => idx >= r.start && idx < r.end);

    // Find the most recent `#` that is NOT inside a confirmed mention.
    let hashIndex = -1;
    {
      let i = beforeCursor.lastIndexOf('#');
      while (i !== -1) {
        if (!inReserved(i)) { hashIndex = i; break; }
        if (i === 0) break;
        i = beforeCursor.lastIndexOf('#', i - 1);
      }
    }


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

    // Check for unified mention (@ prefix) - members + roles + global mentions.
    // We scan from the right for an `@` not inside a confirmed mention range.
    let atIndex = -1;
    {
      let i = beforeCursor.lastIndexOf('@');
      while (i !== -1) {
        if (!inReserved(i)) { atIndex = i; break; }
        if (i === 0) break;
        i = beforeCursor.lastIndexOf('@', i - 1);
      }
    }

    if (atIndex !== -1) {
      const charBefore = atIndex === 0 ? '' : beforeCursor[atIndex - 1];
      if (atIndex === 0 || charBefore === ' ' || charBefore === '\n' || charBefore === '\t') {
        const query = beforeCursor.slice(atIndex + 1);
        if (/^[\w\u00C0-\u024F]*$/.test(query)) {
          return {
            type: 'user' as const,
            query,
            startIndex: atIndex,
            triggerLength: 1,
          };
        }
      }
    }

    // Check for color autocomplete (`<` prefix) — `<` must be at start or after whitespace.
    let ltIndex = -1;
    {
      let i = beforeCursor.lastIndexOf('<');
      while (i !== -1) {
        if (!inReserved(i)) { ltIndex = i; break; }
        if (i === 0) break;
        i = beforeCursor.lastIndexOf('<', i - 1);
      }
    }
    if (ltIndex !== -1) {
      const charBefore = ltIndex === 0 ? '' : beforeCursor[ltIndex - 1];
      if (ltIndex === 0 || charBefore === ' ' || charBefore === '\n' || charBefore === '\t') {
        const query = beforeCursor.slice(ltIndex + 1);
        // Only valid name-ish characters; bail as soon as we see `>` `:` `#` etc.
        if (/^[a-zA-Z]*$/.test(query)) {
          return {
            type: 'color' as const,
            query,
            startIndex: ltIndex,
            triggerLength: 1,
          };
        }
      }
    }

    return null;
  }, [channels]);


  // Re-validate the mention entries against the current text. Drops entries whose
  // display text no longer appears (e.g. the user deleted/edited the mention).
  const revalidateEntries = useCallback((text: string) => {
    const entries = mentionEntriesRef.current;
    if (entries.length === 0) return;
    const next: MentionEntry[] = [];
    let cursor = 0;
    for (const e of entries) {
      const at = text.indexOf(e.display, cursor);
      if (at === -1) continue;
      next.push(e);
      cursor = at + e.display.length;
    }
    if (next.length !== entries.length) {
      mentionEntriesRef.current = next;
      setMentionRev(r => r + 1);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // `:nom:` complet qui designe un emoji de serveur : remplace par l'emoji (comme en le choisissant dans le selecteur).
    const typed = /(^|[\s>])(:([A-Za-z0-9_]{2,32}):)$/.exec(newValue.slice(0, cursorPos));
    const known = typed ? lookupEmoji(typed[3]) : undefined;
    if (typed && known && cursorPos === e.target.selectionEnd && emojiToken(known).startsWith('<')) {
      const start = cursorPos - typed[2].length;
      const display = '\u2003\u2002';
      const list = mentionEntriesRef.current;
      let cursor = 0;
      let idx = list.length;
      for (let i = 0; i < list.length; i++) {
        const pos = newValue.indexOf(list[i].display, cursor);
        if (pos === -1) continue;
        if (pos >= start) { idx = i; break; }
        cursor = pos + list[i].display.length;
      }
      mentionEntriesRef.current = [...list.slice(0, idx), { display, token: emojiToken(known), kind: 'emoji', url: known.url }, ...list.slice(idx)];
      setMentionRev((r) => r + 1);
      const next = newValue.slice(0, start) + display + newValue.slice(cursorPos);
      onChange(next);
      const caret = start + display.length;
      setTimeout(() => {
        const ta = textareaRef.current;
        if (ta) ta.selectionStart = ta.selectionEnd = caret;
      }, 0);
      setMentionState(null);
      return;
    }

    onChange(newValue);
    revalidateEntries(newValue);
    
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
      }, 5000);
    }
  }, [onChange, onTypingStart, onTypingStop, detectMentionTrigger, revalidateEntries]);

  const sendAfterMentionRef = useRef(false);
  const handleSendMessageRef = useRef<(() => void) | null>(null);

  const classifyMention = useCallback((token: string, displayText: string): MentionEntry | null => {
    // Role: <@&SNOWFLAKE>
    let m = token.match(/^<@&(\d{18})>$/);
    if (m) {
      const uuid = snowflakeToUuid(m[1]);
      const role = uuid ? roles.find(r => r.id === uuid) : undefined;
      return { display: displayText, token, kind: 'role', color: role?.color };
    }
    // User: <@SNOWFLAKE>
    m = token.match(/^<@(\d{18})>$/);
    if (m) return { display: displayText, token, kind: 'user' };
    // Channel: <#SNOWFLAKE>
    m = token.match(/^<#(\d{18})>$/);
    if (m) return { display: displayText, token, kind: 'channel' };
    // Color: <c:#rrggbb>
    m = token.match(/^<c:(#[0-9a-fA-F]{6})>$/);
    if (m) return { display: displayText, token, kind: 'color', color: m[1] };
    return null;
  }, [roles]);

  const handleMentionSelect = useCallback((mention: string, displayText: string) => {
    if (!mentionState) return;

    const entry = classifyMention(mention, displayText);
    // Insert the visible display text so the textarea and overlay stay in sync.
    // The raw token is reconstructed at send-time via mentionEntriesRef.
    const inserted = entry ? displayText : mention;

    const start = mentionState.startIndex;
    // Replace the entire trigger span: `#` + typed query (whatever it was when
    // the autocomplete opened). We deliberately do NOT use the textarea's live
    // selectionStart because clicking a suggestion can desync it.
    let end = start + mentionState.triggerLength + mentionState.query.length;
    // If the user kept typing past the captured query, extend until the next
    // whitespace or another trigger char so we don't leave residue.
    while (end < value.length && /\S/.test(value[end]) && value[end] !== '@' && value[end] !== '#') {
      end++;
    }
    const before = value.slice(0, start);
    // Consume any whitespace that already follows the trigger — we'll add
    // exactly one separating space ourselves.
    const after = value.slice(end).replace(/^[ \t]+/, '');
    const newValue = before + inserted + ' ' + after;

    if (entry) {
      // Append entry in document order (validated on every change).
      mentionEntriesRef.current = [...mentionEntriesRef.current, entry];
      setMentionRev(r => r + 1);
    }

    onChange(newValue);
    setMentionState(null);

    // Set cursor position right after the inserted mention + single space.
    const newPos = start + inserted.length + 1;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
      }
    }, 0);
  }, [mentionState, value, onChange, classifyMention]);

  // Get filtered suggestions count for keyboard navigation
  const getSuggestionsCount = useCallback(() => {
    if (!mentionState) return 0;
    const q = mentionState.query.toLowerCase();
    
    if (mentionState.type === 'user') {
      const memberCount = members.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.username.toLowerCase().includes(q)
      ).slice(0, 10).length;
      const specialCount = canMentionEveryone
        ? ['everyone', 'here'].filter(r => r.includes(q)).length
        : 0;
      const roleCount = roles.filter(r => r.name.toLowerCase().includes(q)).slice(0, 8).length;
      return memberCount + specialCount + roleCount;
    }
    if (mentionState.type === 'channel') {
      // Smart match using normalized search
      const normalizedQuery = normalizeForSearch(mentionState.query);
      return channels.filter(c => normalizeForSearch(c.name).includes(normalizedQuery)).slice(0, 10).length;
    }
    if (mentionState.type === 'color') {
      const normalizedQuery = normalizeForSearch(mentionState.query);
      return NAMED_COLORS.filter(c => normalizeForSearch(c.name).includes(normalizedQuery)).slice(0, 10).length;
    }
    return 0;
  }, [mentionState, members, roles, channels, canMentionEveryone]);

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

    // Helper: compute current mention display ranges in the value
    const getMentionRanges = (): Array<{ start: number; end: number }> => {
      const ranges: Array<{ start: number; end: number }> = [];
      let cursor = 0;
      for (const entry of mentionEntriesRef.current) {
        const at = value.indexOf(entry.display, cursor);
        if (at === -1) continue;
        ranges.push({ start: at, end: at + entry.display.length });
        cursor = at + entry.display.length;
      }
      return ranges;
    };

    // Atomic mention navigation: ArrowLeft/Right jump over mentions instead of entering them.
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const ta = textareaRef.current;
      if (ta && ta.selectionStart === ta.selectionEnd) {
        const caret = ta.selectionStart;
        const ranges = getMentionRanges();
        for (const r of ranges) {
          if (e.key === 'ArrowRight' && caret === r.start) {
            e.preventDefault();
            ta.setSelectionRange(r.end, r.end);
            return;
          }
          if (e.key === 'ArrowLeft' && caret === r.end) {
            e.preventDefault();
            ta.setSelectionRange(r.start, r.start);
            return;
          }
          if (caret > r.start && caret < r.end) {
            e.preventDefault();
            const target = e.key === 'ArrowLeft' ? r.start : r.end;
            ta.setSelectionRange(target, target);
            return;
          }
        }
      }
    }

    // Color pill: caret strictly inside (Backspace/Delete) explodes pill back to raw <c:#hex>.
    // Also: Delete at the exact left edge of any entry deletes the whole display atomically (symmetry with Backspace at right edge).
    if ((e.key === 'Backspace' || e.key === 'Delete') && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const ta = textareaRef.current;
      if (ta && ta.selectionStart === ta.selectionEnd) {
        const caret = ta.selectionStart;
        const entries = mentionEntriesRef.current;
        console.log('[colorDbg] KEYDOWN', e.key, { caret, value, entries: entries.map(en => ({ d: en.display, k: en.kind, t: en.token })) });
        if (entries.length > 0) {
          let cursor = 0;
          for (const entry of entries) {
            const at = value.indexOf(entry.display, cursor);
            if (at === -1) break;
            const end = at + entry.display.length;
            // Inside a color pill -> explode to raw token
            if (entry.kind === 'color' && caret > at && caret < end) {
              console.log('[colorDbg] EXPLODE entry', { at, end, caret, token: entry.token, display: entry.display });
              e.preventDefault();

              const newValue = value.slice(0, at) + entry.token + value.slice(end);
              mentionEntriesRef.current = entries.filter(x => x !== entry);
              setMentionRev(r => r + 1);
              onChange(newValue);
              const newCaret = at + entry.token.length;
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  textareaRef.current.setSelectionRange(newCaret, newCaret);
                }
              });
              return;
            }
            // Delete at exact left edge -> atomic delete of whole entry
            if (e.key === 'Delete' && caret === at) {
              e.preventDefault();
              const newValue = value.slice(0, at) + value.slice(end);
              mentionEntriesRef.current = entries.filter(x => x !== entry);
              setMentionRev(r => r + 1);
              onChange(newValue);
              requestAnimationFrame(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  textareaRef.current.setSelectionRange(at, at);
                }
              });
              return;
            }
            cursor = end;
          }
        }
      }
    }


    // Backspace at the right edge of a mention deletes the whole mention in one go.
    if (e.key === 'Backspace' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const ta = textareaRef.current;
      if (ta && ta.selectionStart === ta.selectionEnd) {
        const caret = ta.selectionStart;
        const entries = mentionEntriesRef.current;
        if (entries.length > 0) {
          // Walk entries in order so duplicate displays resolve to the correct occurrence.
          let cursor = 0;
          for (const entry of entries) {
            const at = value.indexOf(entry.display, cursor);
            if (at === -1) break;
            const end = at + entry.display.length;
            if (caret === end) {
              e.preventDefault();
              const newValue = value.slice(0, at) + value.slice(end);
              onChange(newValue);
              mentionEntriesRef.current = entries.filter(x => x !== entry);
              setMentionRev(r => r + 1);
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.selectionStart = textareaRef.current.selectionEnd = at;
                  textareaRef.current.focus();
                }
              }, 0);
              return;
            }
            cursor = end;
          }
        }
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
  }, [value, mentionState, getSuggestionsCount, mentionSelectedIndex, attachments.length, onChange, isMobile]);

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

  // Resolve display-text mentions back into <@SNOWFLAKE> / <#…> / <@&…> tokens.
  const resolveContent = useCallback((text: string): string => {
    const entries = mentionEntriesRef.current;
    if (entries.length === 0) return resolveShortcodes(text);
    let result = '';
    let cursor = 0;
    for (const e of entries) {
      const at = text.indexOf(e.display, cursor);
      if (at === -1) continue;
      result += text.slice(cursor, at) + e.token;
      cursor = at + e.display.length;
    }
    result += text.slice(cursor);
    return resolveShortcodes(result);
  }, []);

  // Pending-send pattern: when entries exist, we mutate `value` to the resolved
  // form via onChange first, then trigger the actual send once the parent has
  // committed the new value (avoids stale closures in parent's onSend).
  const pendingSendRef = useRef(false);

  const performSend = useCallback(() => {
    {
      const resolved = resolveContent(value);
      if (resolved !== value) {
        pendingSendRef.current = true;
        onChange(resolved);
        return;
      }
    }
    setLastSentAt(Date.now());
    const attachmentData = attachments.map(a => ({
      file: a.file,
      name: a.name,
      description: a.description,
      isSpoiler: a.isSpoiler,
    }));
    onSend(attachmentData.length > 0 ? attachmentData : undefined);
    onClearAttachments?.();
    mentionEntriesRef.current = [];
    setMentionRev(r => r + 1);
  }, [attachments, onSend, onClearAttachments, value, onChange, resolveContent]);

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
    if (pendingSendRef.current) {
      pendingSendRef.current = false;
      // Now that value has been resolved into token form, run the actual send.
      performSend();
    }
  }, [value, performSend]);

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

  /*
   * Discord composer gutter.
   *
   * Measured against the reference screenshot, not guessed:
   *   box     44px  <- --custom-channel-textarea-text-area-height
   *   gutter  8px below, nothing above (the breathing room lives in the
   *           message scroller, not here)
   *   row     52px, flush with the window edge
   *   panel   53px, also flush with the window edge
   *
   * Both rows therefore start within 1px of each other and both blocks are
   * bottom-aligned, which is what the reference actually shows: the panel is
   * ~9px taller than the composer box because it has no bottom gutter.
   *
   * `px-4` is Discord's `.formWithLoadedChatInput { padding: 0 16px }`.
   */
  const nonCompactPadding = isMobile
    ? "px-2 py-0 pb-[calc(0.125rem+env(safe-area-inset-bottom,0px))]"
    : "px-2 pt-0 pb-2";
  const nonCompactContainerClass = `${nonCompactPadding} flex-shrink-0 flex flex-col w-full min-w-0 relative`;

  /* Anatomie du composeur Discord :
       rayon          --radius-sm            8px  (etait 16px en rounded-2xl)
       fond           --input                neutral-64
       marge basse    16px
       bordure        aucune
       ombre          aucune
     Le composeur de Discord est un simple bloc de fond : toute bordure ou
     toute ombre le faisait ressembler a une carte flottante. */
  const composerCls =
    "flex items-center rounded-lg bg-[hsl(var(--input))] px-4 py-3";

  // Render follow bar for announcement channels when permission is denied
  if (permissionDeniedMessage && showFollowBar) {
    return (
      <div className={compact ? "p-3 border-t border-white/10 w-full relative" : nonCompactContainerClass}>
        <div className={`${composerCls} justify-between min-h-[58px]`}>
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
        {/* Meme hauteur que la barre de saisie (58 px) : aucun saut de mise en page quand le verdict arrive. */}
        <div className={`${composerCls} min-h-[58px]`}>
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
        accept={acceptFor(ALL_MEDIA_KINDS)}
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
        {slash && (
          <SlashMenuLayer
            value={value}
            serverId={serverId}
            textareaRef={textareaRef}
            enabled={!slashCommand && !editingMessageId && !disabled}
            onPick={pickSlashCommand}
          />
        )}

        {/* Mention Autocomplete */}
        {mentionState && (
          <MentionAutocomplete
            type={mentionState.type}
            query={mentionState.query}
            members={members}
            roles={roles}
            channels={channels}
            colors={NAMED_COLORS}
            onSelect={handleMentionSelect}
            onClose={() => setMentionState(null)}
            selectedIndex={mentionSelectedIndex}
            onIndexChange={setMentionSelectedIndex}
            canMentionEveryone={canMentionEveryone}
          />
        )}
        
        {/*
         * Discord composer: a SINGLE row — plus on the left, text in the middle,
         * tools on the right — instead of a textarea stacked above a toolbar.
         * The toolbar used to add a bordered second line, which made the input
         * ~90px tall and impossible to align with the sidebar's user panel.
         */}
        {slash && slashCommand ? (
          <SlashCommandRunner
            command={slashCommand}
            serverId={serverId}
            channelId={channelId ?? dmConversationId}
            members={members}
            handlers={slash}
            onDone={() => {
              setSlashCommand(null);
              setTimeout(() => textareaRef.current?.focus(), 0);
            }}
          />
        ) : (
        <div
          className={cn(
            // Cotes de la capture de reference :
            //   rayon 8px, bordure 1px #3d3e44, fond #393a41
            //   hauteur 58px bordure comprise, marges de 8px autour
            'composer-box flex items-center gap-3 w-full min-w-0 bg-[hsl(var(--input))] border border-[hsl(var(--input-border))] transition-colors duration-200',
            compact
              ? 'rounded-lg px-2 py-1.5'
              : 'rounded-lg pl-3 pr-4 py-2 min-h-[58px]',
          )}
        >
          <Popover
            open={plusMenuOpen}
            onOpenChange={(o) => {
              setPlusMenuOpen(o);
              if (!o) setPlusMenuView('root');
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Ajouter une pièce jointe ou un sondage"
                className={cn(
                  'shrink-0 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors h-8 w-8',
                )}
              >
                {/* Tailles mesurees sur la reference : 20px d'encre pour +, GIF, sticker et emoji ; trait du + plus fin que le glyphe generique. */}
                <ComposerPlus />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={14} className={cn('rounded-lg border border-white/[0.06] bg-[#3b3b45] shadow-[0_8px_16px_rgba(0,0,0,0.24)]', plusMenuView === 'root' ? 'w-[218px] p-2' : 'w-auto p-1 py-2')}>
              {plusMenuView === 'color' ? (
                <ColorInsertPanel
                  onBack={() => setPlusMenuView('root')}
                  onPick={(hex) => {
                    setPlusMenuOpen(false);
                    setPlusMenuView('root');
                    insertColor(hex);
                  }}
                />
              ) : (<>
              {canAttachFiles && (
                <button type="button" className={PLUS_ITEM} onClick={() => { setPlusMenuOpen(false); setMediaModalOpen(true); }}>
                  <PlusIconUpload />
                  <span>Uploader un fichier</span>
                </button>
              )}
              {serverId && channelId && !threadId && !dmConversationId && !editingMessageId && (
                <button type="button" className={PLUS_ITEM} onClick={() => { setPlusMenuOpen(false); openNewThread(channelId); }}>
                  <PlusIconThread />
                  <span>Créer un fil</span>
                </button>
              )}
              {(channelId || threadId || dmConversationId) && canCreatePolls && (
                <button type="button" className={PLUS_ITEM} onClick={() => { setPlusMenuOpen(false); setPollModalOpen(true); }}>
                  <PlusIconPoll />
                  <span>Créer le sondage</span>
                </button>
              )}
              {extraPlusItems?.map(({ key, label, icon: ItemIcon, onClick }) => (
                <button key={key} type="button" className={PLUS_ITEM} onClick={() => { setPlusMenuOpen(false); onClick(); }}>
                  <ItemIcon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
              {slash && (
                <button
                  type="button"
                  className={PLUS_ITEM}
                  onClick={() => {
                    setPlusMenuOpen(false);
                    onChange('/');
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                >
                  <PlusIconApps />
                  <span>Utiliser des applications</span>
                </button>
              )}
              <button type="button" className={PLUS_ITEM} onClick={() => setPlusMenuView('color')}>
                <Palette className="w-5 h-5" />
                <span className="flex-1 text-left">Couleur</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              </>)}
            </PopoverContent>
          </Popover>

          {/* Relative wrapper: the markdown overlay is inset-0 of this box, and
              the textarea is its only in-flow child, so the two always align
              pixel for pixel no matter how the draft wraps. */}
          <div className="relative flex-1 min-w-0">
            {hasMarkdown && (
              <InputMarkdownOverlay
                ref={overlayRef}
                content={value}
                compact={compact}
                className="p-0"
                mentionData={{ members, roles, channels }}
                mentionEntries={mentionEntriesRef.current}
              />
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onSelect={(e) => {
                const ta = e.currentTarget;
                const entries = mentionEntriesRef.current;
                if (entries.length === 0) return;
                const ranges: Array<{ start: number; end: number }> = [];
                let cur = 0;
                for (const entry of entries) {
                  const at = value.indexOf(entry.display, cur);
                  if (at === -1) continue;
                  ranges.push({ start: at, end: at + entry.display.length });
                  cur = at + entry.display.length;
                }
                if (ranges.length === 0) return;
                let s = ta.selectionStart;
                let en = ta.selectionEnd;
                const collapsed = s === en;
                const sBefore = s;
                const enBefore = en;
                let changed = false;
                for (const r of ranges) {
                  if (collapsed) {
                    if (s > r.start && s < r.end) {
                      const target = (s - r.start) <= (r.end - s) ? r.start : r.end;
                      s = en = target;
                      changed = true;
                    }
                  } else {
                    if (s > r.start && s < r.end) { s = r.start; changed = true; }
                    if (en > r.start && en < r.end) { en = r.end; changed = true; }
                  }
                }
                if (changed) {
                  if (s > en) { const t = s; s = en; en = t; }
                  console.log('[colorDbg] onSelect SNAP', { sBefore, enBefore, sAfter: s, enAfter: en, ranges });
                  ta.setSelectionRange(s, en);
                } else {
                  console.log('[colorDbg] onSelect no-snap', { s: sBefore, en: enBefore, ranges });
                }
              }}

              onClick={(e) => {
                const ta = e.currentTarget;
                const entries = mentionEntriesRef.current;
                if (entries.length === 0) return;
                let cur = 0;
                const ranges: Array<{ start: number; end: number; index: number }> = [];
                for (let i = 0; i < entries.length; i++) {
                  const entry = entries[i];
                  if (!entry.display) continue;
                  const at = value.indexOf(entry.display, cur);
                  if (at === -1) continue;
                  ranges.push({ start: at, end: at + entry.display.length, index: i });
                  cur = at + entry.display.length;
                }
                const s = ta.selectionStart;
                if (s !== ta.selectionEnd) return;
                const hit = ranges.find((r) => s >= r.start && s <= r.end);
                if (!hit) return;
                const entry = entries[hit.index];
                if (entry.kind !== 'color' || !entry.color) return;
                const span = overlayRef.current?.querySelector<HTMLElement>(`[data-color-entry-index="${hit.index}"]`);
                if (!span) return;
                const r = span.getBoundingClientRect();
                const normalized = normalizeHex(entry.color) ?? '#000000';
                setColorEditor({
                  entryIndex: hit.index,
                  hex: normalized,
                  rect: { left: r.left, top: r.top, width: r.width, height: r.height },
                });
                setColorEditorDraft(normalized);
              }}
              onMouseMove={(e) => {
                const ta = e.currentTarget;
                const cx = e.clientX;
                const cy = e.clientY;
                if (cursorRafRef.current != null) return;
                cursorRafRef.current = requestAnimationFrame(() => {
                  cursorRafRef.current = null;
                  const overlay = overlayRef.current;
                  if (!overlay) { ta.style.cursor = ''; return; }
                  const spans = overlay.querySelectorAll<HTMLElement>('[data-color-entry-index]');
                  let hover = false;
                  for (const sp of Array.from(spans)) {
                    const r = sp.getBoundingClientRect();
                    if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
                      hover = true; break;
                    }
                  }
                  ta.style.cursor = hover ? 'pointer' : '';
                });
              }}
              onMouseLeave={(e) => { e.currentTarget.style.cursor = ''; }}
              onPaste={handlePaste}
              onScroll={() => { if (overlayRef.current && textareaRef.current) overlayRef.current.scrollTop = textareaRef.current.scrollTop; }}
              placeholder={placeholder}
              data-editing={editingMessageId ? 'true' : 'false'}
              disabled={disabled}
              className={`relative z-10 block m-0 w-full rounded-none border-0 bg-transparent px-0 py-0 shadow-none appearance-none placeholder:text-[hsl(var(--text-placeholder))] placeholder:overflow-hidden placeholder:text-ellipsis placeholder:whitespace-nowrap focus:outline-none focus-visible:outline-none focus:ring-0 resize-none break-words box-border font-normal tracking-normal text-sm min-h-[24px] ${
                hasMarkdown ? 'text-transparent caret-foreground' : 'text-foreground'
              } ${
                compact ? 'max-h-[120px] overflow-y-auto' : 'max-h-[200px] overflow-y-auto'
              }`}
              style={{ fontSize: OVERLAY_FONT_SIZE, lineHeight: OVERLAY_LINE_HEIGHT, fontFamily: INPUT_FONT_FAMILY, fontWeight: 400, fontSynthesis: 'none', letterSpacing: 'normal' }}
              rows={1}
            />
          </div>

          {/*
           * Serveurs et messages prives (videos de reference) : cadeau, GIF, autocollants, emoji et applications.
           * Variante compacte (fils, panneaux) : un seul bouton emoji, le selecteur universel contient les onglets.
           */}
          <div className={cn('flex items-center shrink-0', !compact ? 'gap-0' : 'gap-2')}>
            {!compact ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Offrir un cadeau" onClick={() => toast.info('Bientôt disponible')} className={DM_ACTION}>
                      <Gift className="w-6 h-6" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Offrir un cadeau</TooltipContent>
                </Tooltip>
                {(['gif', 'sticker', 'emoji'] as const).map((tab) => (
                  <EmojiStickerPicker
                    key={tab}
                    serverId={serverId}
                    onEmojiSelect={insertEmoji}
                    onStickerSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'sticker' })}
                    onGifSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'gif' })}
                    defaultTab={tab}
                    trigger={
                      <button type="button" aria-label={tab === 'gif' ? 'Ouvrir le sélecteur de GIF' : tab === 'sticker' ? 'Ouvrir le sélecteur d\'autocollants' : 'Ouvrir le sélecteur d\'emojis'} className={DM_ACTION}>
                        {tab === 'gif' ? (
                          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden><rect x="2.5" y="4.5" width="19" height="15" rx="3.5" fill="currentColor" /><text x="12" y="15.2" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="hsl(var(--surface-card))" fontFamily="inherit">GIF</text></svg>
                        ) : tab === 'sticker' ? (
                          <Sticker className="w-6 h-6" />
                        ) : (
                          <Smile className="w-6 h-6" />
                        )}
                      </button>
                    }
                  />
                ))}
                {slash && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Utiliser des applications"
                        onClick={() => {
                          onChange('/');
                          setTimeout(() => textareaRef.current?.focus(), 0);
                        }}
                        className={DM_ACTION}
                      >
                        <IconApps className="w-6 h-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Applications</TooltipContent>
                  </Tooltip>
                )}
              </>
            ) : (
              <EmojiStickerPicker
                serverId={serverId}
                onEmojiSelect={insertEmoji}
                onStickerSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'sticker' })}
                onGifSelect={(url, name) => onSendExternalAttachment?.({ url, name, type: 'gif' })}
                defaultTab="emoji"
                trigger={
                  <button
                    type="button"
                    aria-label="Insérer un emoji"
                    className="flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white transition-colors h-8 w-8"
                  >
                    <Smile className="w-[22px] h-[22px]" />
                  </button>
                }
              />
            )}
            <button
              type="submit"
              disabled={disabled || !canSubmitMessage}
              aria-label="Envoyer"
              // Absent de la capture : Discord n'affiche pas de bouton d'envoi
              // tant que le champ est vide. On ne le montre que s'il sert.
              className={cn(
                'shrink-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 send-button-hover h-8 w-8',
                isSending && 'animate-send-fly',
                canSubmitMessage
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : alwaysShowSend
                    ? 'bg-[hsl(var(--button-secondary))] text-muted-foreground'
                    : 'hidden',
              )}
            >
              <Send className="w-[18px] h-[18px]" strokeWidth={2.5} />
            </button>
          </div>
      </div>
        )}
      </form>

      <MediaUploadModal
        open={mediaModalOpen}
        onOpenChange={setMediaModalOpen}
        targetName={dmConversationId ? undefined : `#${channelName}`}
        onConfirm={(files, meta) => {
          onAddFiles?.(files, meta);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }}
      />

      {colorEditor && (() => {
        const draft = colorEditorDraft;
        const v = draft.trim();
        const fromHex = normalizeHex(v);
        let resolved: string | null = fromHex;
        if (!resolved && v) {
          const lc = v.toLowerCase();
          const named = NAMED_COLORS.find((c) => c.name.toLowerCase() === lc);
          if (named) resolved = normalizeHex(named.hex);
        }
        const close = () => setColorEditor(null);
        const apply = () => {
          if (!resolved) return;
          const idx = colorEditor.entryIndex;
          const list = mentionEntriesRef.current.slice();
          const e = list[idx];
          if (!e) { close(); return; }
          const newDisplay = `\u25A0 ${nearestColorName(resolved)}`;
          // Locate the old display in value at its sequential position.
          let cur = 0;
          let oldAt = -1;
          for (let i = 0; i <= idx; i++) {
            const en = list[i];
            if (!en?.display) continue;
            const at = value.indexOf(en.display, cur);
            if (at === -1) break;
            if (i === idx) { oldAt = at; break; }
            cur = at + en.display.length;
          }
          list[idx] = { ...e, display: newDisplay, color: resolved, token: `<c:${resolved}>` };
          mentionEntriesRef.current = list;
          if (oldAt !== -1) {
            const newValue = value.slice(0, oldAt) + newDisplay + value.slice(oldAt + e.display.length);
            onChange(newValue);
          }
          setMentionRev((r) => r + 1);
          close();
        };
        const POP_W = 280;
        const POP_H_EST = 380;
        let left = colorEditor.rect.left + colorEditor.rect.width / 2 - POP_W / 2;
        left = Math.max(8, Math.min(window.innerWidth - POP_W - 8, left));
        let top = colorEditor.rect.top - POP_H_EST - 8;
        if (top < 8) top = colorEditor.rect.top + colorEditor.rect.height + 8;
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
            <div
              role="dialog"
              className="fixed z-50 rounded-xl border border-border bg-popover shadow-xl p-3 space-y-3"
              style={{ left, top, width: POP_W }}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
            >
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Couleur (hex ou nom)</label>
                <input
                  autoFocus
                  value={colorEditorDraft}
                  onChange={(e) => setColorEditorDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && resolved) { e.preventDefault(); apply(); } }}
                  placeholder="#ff00aa ou Red"
                  className={`w-full bg-background border rounded-md px-2 py-1.5 text-sm font-mono outline-none ${resolved ? 'border-border' : 'border-destructive'}`}
                />
                {!resolved && colorEditorDraft.trim() && (
                  <p className="text-[11px] text-destructive">Hex ou nom de couleur invalide</p>
                )}
              </div>
              <ModernColorPicker
                value={resolved ?? colorEditor.hex}
                onChange={(h) => setColorEditorDraft(h)}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={close}>Annuler</Button>
                <Button size="sm" disabled={!resolved} onClick={apply}>Éditer</Button>
              </div>
            </div>
          </>
        );
      })()}


      
      {dmConversationId ? (
        <CreateDMPollModal
          conversationId={dmConversationId}
          open={pollModalOpen}
          onOpenChange={setPollModalOpen}
        />
      ) : (channelId || threadId) ? (
        <CreatePollModal
          channelId={channelId || ''}
          serverId={serverId}
          threadId={threadId}
          open={pollModalOpen}
          onOpenChange={setPollModalOpen}
          onDraft={onDraftPoll}
        />
      ) : null}

      <MentionEveryoneWarningModal
        open={pendingEveryoneMention !== null}
        mentionType={pendingEveryoneMention ?? 'everyone'}
        onConfirm={handleConfirmEveryone}
        onEdit={handleEditEveryone}
      />
    </div>
  );
}
