import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Palette, Trash2 } from 'lucide-react';
import { ModernColorPicker } from './ModernColorPicker';
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#00D4FF', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#3B82F6', '#A78BFA',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: string; // YYYY-MM-DD
  initialTime?: string; // HH:MM
  editing?: CalendarEvent | null;
}

export function CreateEventModal({ open, onOpenChange, initialDate, initialTime, editing }: Props) {
  const { create, update, remove } = useCalendarEvents();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(initialTime || '12:00');
  const [color, setColor] = useState('#00D4FF');
  const [isPublic, setIsPublic] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setDescription(editing.description || '');
      setDate(editing.event_date);
      setTime(editing.event_time.slice(0, 5));
      setColor(editing.color);
      setIsPublic(editing.is_public);
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setTime(initialTime || '12:00');
      setColor('#00D4FF');
      setIsPublic(false);
    }
    setShowPicker(false);
  }, [open, editing, initialDate, initialTime]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim().slice(0, 120),
      description: description.trim() ? description.trim().slice(0, 500) : null,
      event_date: date,
      event_time: `${time}:00`,
      color,
      is_public: isPublic,
    };
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await remove.mutateAsync(editing.id);
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Modifier l\'évènement' : 'Nouvel évènement'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evt-title">Titre</Label>
            <Input
              id="evt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="Réunion équipe..."
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="evt-desc">Description</Label>
              <span className="text-[11px] text-muted-foreground">{description.length}/500</span>
            </div>
            <Textarea
              id="evt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Détails facultatifs..."
              rows={3}
              maxLength={500}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="evt-date">Date</Label>
              <Input id="evt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evt-time">Heure</Label>
              <Input id="evt-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setShowPicker(false); }}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    color === c ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Couleur ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={() => setShowPicker((s) => !s)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors',
                  showPicker ? 'border-primary bg-primary/10' : 'border-border hover:border-primary',
                )}
                aria-label="Couleur personnalisée"
              >
                <Palette className="w-4 h-4" />
              </button>
            </div>
            {showPicker && <ModernColorPicker value={color} onChange={setColor} />}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <div>
              <Label htmlFor="evt-public" className="font-medium">Public</Label>
              <p className="text-[11px] text-muted-foreground">Visible sur votre profil par les autres</p>
            </div>
            <Switch id="evt-public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {editing && (
            <Button variant="ghost" size="icon" onClick={handleDelete} className="mr-auto text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
