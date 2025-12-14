import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmojiStickerPicker } from './EmojiStickerPicker';
import { useCreatePoll } from '@/hooks/usePolls';
import { Plus, Trash2, Smile } from 'lucide-react';

interface CreatePollModalProps {
  channelId: string;
  serverId: string | null;
  threadId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PollOptionInput {
  id: string;
  text: string;
  emoji: string | null;
}

const DURATION_OPTIONS = [
  { value: '24h', label: '24 heures' },
  { value: '3d', label: '3 jours' },
  { value: '7d', label: '7 jours' },
  { value: '14d', label: '2 semaines' },
  { value: 'unlimited', label: 'Illimité' }
];

export function CreatePollModal({ 
  channelId, 
  serverId,
  threadId,
  open = false,
  onOpenChange
}: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOptionInput[]>([
    { id: '1', text: '', emoji: null },
    { id: '2', text: '', emoji: null }
  ]);
  const [duration, setDuration] = useState('24h');
  const [allowMultiple, setAllowMultiple] = useState(false);

  const createPoll = useCreatePoll();

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
      case '24h': return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case '3d': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case '14d': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      default: return null;
    }
  };

  const handleSubmit = () => {
    const validOptions = options.filter(opt => opt.text.trim());
    if (!question.trim() || validOptions.length < 1) return;

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[450px] p-0 bg-[#313338] border-none gap-0">
        <DialogHeader className="px-4 py-3 border-b border-white/10">
          <DialogTitle className="font-semibold text-foreground">
            Créer un sondage
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4 space-y-4">
            {/* Question */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Question
              </Label>
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value.slice(0, 300))}
                placeholder="Quelle question voulez-vous poser ?"
                className="bg-[#1e1f22] border-none resize-none min-h-[80px]"
              />
              <div className="text-xs text-muted-foreground text-right">
                {question.length} / 300
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Réponses
              </Label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <EmojiStickerPicker
                      serverId={serverId}
                      onEmojiSelect={(emoji) => updateOption(option.id, { emoji })}
                      trigger={
                        <button 
                          className="w-10 h-10 flex items-center justify-center rounded bg-[#1e1f22] hover:bg-[#2b2d31] transition-colors text-lg"
                        >
                          {option.emoji || <Smile className="w-4 h-4 text-muted-foreground" />}
                        </button>
                      }
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(option.id, { text: e.target.value.slice(0, 100) })}
                      placeholder={`Réponse ${index + 1}`}
                      className="flex-1 bg-[#1e1f22] border-none"
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => removeOption(option.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  onClick={addOption}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une réponse
                </button>
              )}

              <div className="text-xs text-muted-foreground">
                {options.length} / 10 réponses
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Durée
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="bg-[#1e1f22] border-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multiple Answers */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="allow-multiple"
                checked={allowMultiple}
                onCheckedChange={(checked) => setAllowMultiple(checked === true)}
              />
              <Label htmlFor="allow-multiple" className="text-sm cursor-pointer">
                Autoriser les réponses multiples
              </Label>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="text-sm"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createPoll.isPending}
            className="bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm"
          >
            Publier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
