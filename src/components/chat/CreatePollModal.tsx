import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { useCreatePoll, useUpdatePoll, Poll } from '@/hooks/usePolls';
import { Plus, Trash2, Smile } from '@/components/icons/discord/lucide';

/** Sondage prepare avant la creation d'un fil : enregistre une fois le fil cree. */
export interface PollDraft {
  question: string;
  options: { text: string; emoji: string | null }[];
  allowMultiple: boolean;
  expiresAt: Date;
}

interface CreatePollModalProps {
  /** Si fourni, le sondage n'est pas envoye : il est remis a l'appelant (creation d'un fil). */
  onDraft?: (draft: PollDraft) => void;
  channelId: string;
  serverId: string | null;
  threadId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editPoll?: Poll | null;
}

interface PollOptionInput {
  id: string;
  text: string;
  emoji: string | null;
}

const DURATION_OPTIONS = [
  { value: '1h', label: '1 heure' },
  { value: '4h', label: '4 heures' },
  { value: '8h', label: '8 heures' },
  { value: '24h', label: '24 heures' },
  { value: '3d', label: '3 jours' },
  { value: '7d', label: '1 semaine' },
  { value: '14d', label: '2 semaines' }
];

export function CreatePollModal({ 
  channelId, 
  serverId,
  threadId,
  open = false,
  onOpenChange,
  editPoll,
  onDraft,
}: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOptionInput[]>([
    { id: '1', text: '', emoji: null },
    { id: '2', text: '', emoji: null }
  ]);
  const [duration, setDuration] = useState('24h');
  const [allowMultiple, setAllowMultiple] = useState(false);

  const createPoll = useCreatePoll();
  const updatePoll = useUpdatePoll();

  const isEditMode = !!editPoll;

  // Pre-fill form when editing
  useEffect(() => {
    if (editPoll) {
      setQuestion(editPoll.question);
      setOptions(editPoll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        emoji: opt.emoji
      })));
      setAllowMultiple(editPoll.allow_multiple);
    } else {
      resetForm();
    }
  }, [editPoll]);

  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: Date.now().toString(), text: '', emoji: null }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 1) return;
    setOptions(options.filter(opt => opt.id !== id));
  };

  const updateOption = (id: string, updates: Partial<PollOptionInput>) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, ...updates } : opt));
  };

  const getExpiresAt = (): Date | null => {
    const now = new Date();
    switch (duration) {
      case '1h': return new Date(now.getTime() + 1 * 60 * 60 * 1000);
      case '4h': return new Date(now.getTime() + 4 * 60 * 60 * 1000);
      case '8h': return new Date(now.getTime() + 8 * 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '14d': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  };

  const handleSubmit = () => {
    const validOptions = options.filter(opt => opt.text.trim());
    if (!question.trim() || validOptions.length < 1) return;

    if (isEditMode && editPoll) {
      updatePoll.mutate({
        pollId: editPoll.id,
        channelId,
        threadId,
        question: question.trim(),
        options: validOptions.map(opt => ({ text: opt.text.trim(), emoji: opt.emoji }))
      }, {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        }
      });
    } else if (onDraft) {
      onDraft({
        question: question.trim(),
        options: validOptions.map(opt => ({ text: opt.text.trim(), emoji: opt.emoji })),
        allowMultiple,
        expiresAt: getExpiresAt(),
      });
      setOpen(false);
      resetForm();
    } else {
      createPoll.mutate({
        channelId,
        threadId,
        question: question.trim(),
        options: validOptions.map(opt => ({ text: opt.text.trim(), emoji: opt.emoji })),
        allowMultiple,
        expiresAt: getExpiresAt()
      }, {
        onSuccess: () => {
          setOpen(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setQuestion('');
    setOptions([
      { id: '1', text: '', emoji: null },
      { id: '2', text: '', emoji: null }
    ]);
    setDuration('24h');
    setAllowMultiple(false);
  };

  const isValid = question.trim() && options.some(opt => opt.text.trim());
  const isPending = createPoll.isPending || updatePoll.isPending;

  const fieldCls = 'w-full h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.08] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none transition-colors';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            {isEditMode ? 'Modifier le sondage' : 'Crée un sondage'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2 overflow-y-auto scrollbar-thin flex-1 min-h-0">
          <label className="block mb-2 text-base font-medium text-foreground">Question</label>
          <input
            autoFocus
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
            placeholder="Quelle question veux-tu poser ?"
            className={fieldCls}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{question.length} / 300</p>

          <label className="block mt-4 mb-2 text-base font-medium text-foreground">Réponses</label>
          <div className="space-y-2">
            {options.map((option) => (
              <div key={option.id} className="flex items-center gap-2 h-11 pl-3 pr-2 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.08] focus-within:border-primary transition-colors">
                {option.emoji ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" aria-label="Émoji de la réponse" className="w-6 h-6 shrink-0 flex items-center justify-center text-lg leading-none">
                        {option.emoji}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <EmojiStickerPicker
                        serverId={serverId}
                        onEmojiSelect={(emoji) => updateOption(option.id, { emoji })}
                        trigger={<button type="button" className="w-full px-2 py-1.5 text-left text-sm rounded hover:bg-[hsl(var(--interactive-background-hover))]">Remplacer l'émoji</button>}
                      />
                      <DropdownMenuItem className="text-[#f57976]" onSelect={() => updateOption(option.id, { emoji: null })}>
                        Supprimer l'émoji
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <EmojiStickerPicker
                    serverId={serverId}
                    onEmojiSelect={(emoji) => updateOption(option.id, { emoji })}
                    trigger={
                      <button type="button" aria-label="Ajouter un émoji" className="w-6 h-6 shrink-0 flex items-center justify-center text-[hsl(var(--icon-default))] hover:text-white">
                        <Smile className="w-5 h-5" />
                      </button>
                    }
                  />
                )}
                <input
                  value={option.text}
                  onChange={(e) => updateOption(option.id, { text: e.target.value.slice(0, 55) })}
                  placeholder="Entre ta réponse"
                  className="flex-1 min-w-0 bg-transparent text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  disabled={options.length <= 1}
                  aria-label="Supprimer la réponse"
                  className="p-1 text-[hsl(var(--icon-default))] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-base font-medium text-white"
              >
                <Plus className="w-4 h-4" />
                Ajouter une autre réponse
              </button>
            </div>
          )}

          {!isEditMode && (
            <>
              <label className="block mt-4 mb-2 text-base font-medium text-foreground">Durée</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-11 bg-[hsl(var(--search-background))] border-white/[0.08] text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[110]">
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-5 shrink-0">
          {!isEditMode && (
            <label className="flex items-center gap-3 text-base text-foreground cursor-pointer">
              <Checkbox
                id="allow-multiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setAllowMultiple(checked === true)}
                className="w-6 h-6 rounded-md border-[hsl(var(--header-icon))] data-[state=checked]:border-primary"
              />
              Autoriser plusieurs réponses
            </label>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="ml-auto h-11 px-8 text-base"
          >
            {isEditMode ? 'Enregistrer' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
