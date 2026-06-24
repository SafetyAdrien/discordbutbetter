import { useEffect, useRef, useState, useCallback } from 'react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Image as ImageIcon, Trash2, Loader2, Pencil, Scaling } from 'lucide-react';
import { useChannelCalendarEvents, uploadEventThumbnail, type ChannelCalendarEvent } from '@/hooks/useChannelCalendarEvents';
import { useChannels } from '@/hooks/useChannels';
import { ThumbnailCanvasEditor } from '@/components/channels/calendar/ThumbnailCanvasEditor';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  serverId: string | null;
  initialDate?: Date | null;
  editing?: ChannelCalendarEvent | null;
}

const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Aucun rappel' },
  { value: '5', label: '5 minutes avant' },
  { value: '15', label: '15 minutes avant' },
  { value: '30', label: '30 minutes avant' },
  { value: '60', label: '1 heure avant' },
  { value: '1440', label: '1 jour avant' },
];

function toLocalDateInput(d: Date) {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
function toLocalTimeInput(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export function ChannelEventModal({ open, onOpenChange, channelId, serverId, initialDate, editing }: Props) {
  const { create, update, remove } = useChannelCalendarEvents(channelId);
  const { data: channelsData } = useChannels(serverId);
  const allChannels = [
    ...(channelsData?.categories.flatMap((c) => c.channels) ?? []),
    ...(channelsData?.orphanChannels ?? []),
  ];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [reminder, setReminder] = useState<string>('none');
  const [locationChannelId, setLocationChannelId] = useState<string>('none');
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const s = new Date(editing.starts_at);
      const e = new Date(editing.ends_at);
      setTitle(editing.title);
      setDescription(editing.description ?? '');
      setAllDay(editing.all_day);
      setStartDate(toLocalDateInput(s));
      setStartTime(toLocalTimeInput(s));
      setEndDate(toLocalDateInput(e));
      setEndTime(toLocalTimeInput(e));
      setReminder(editing.reminder_minutes != null ? String(editing.reminder_minutes) : 'none');
      setLocationChannelId(editing.location_channel_id ?? 'none');
      setThumbnailUrl(editing.thumbnail_url);
    } else {
      const base = initialDate ?? new Date();
      setTitle('');
      setDescription('');
      setAllDay(false);
      setStartDate(toLocalDateInput(base));
      setStartTime('09:00');
      setEndDate(toLocalDateInput(base));
      setEndTime('10:00');
      setReminder('none');
      setLocationChannelId('none');
      setThumbnailUrl(null);
    }
    setPendingFile(null);
  }, [open, editing, initialDate]);

  const handlePickFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Image uniquement');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image trop lourde (max 8 Mo)');
      return;
    }
    setPendingFile(file);
  };

  const startResizingExisting = useCallback(async () => {
    if (!thumbnailUrl) return;
    setUploading(true);
    try {
      const response = await fetch(thumbnailUrl, { mode: 'cors' });
      if (!response.ok) throw new Error('Impossible de charger l’image');
      const blob = await response.blob();
      const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/avif' ? 'avif' : 'jpg';
      const file = new File([blob], `existing-thumb.${ext}`, { type: blob.type || 'image/jpeg' });
      setPendingFile(file);
    } catch (e: any) {
      toast.error(e?.message ?? 'Échec du chargement de l’image');
    } finally {
      setUploading(false);
    }
  }, [thumbnailUrl]);

  const handleApplyCrop = async (blob: Blob) => {
    try {
      setUploading(true);
      const isPng = blob.type === 'image/png';
      const url = await uploadEventThumbnail(channelId, blob, isPng ? 'thumb.png' : 'thumb.jpg');
      setThumbnailUrl(url);
      setPendingFile(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Échec de l’envoi');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Titre requis');
      return;
    }
    const startISO = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}:00`).toISOString();
    const endISO = allDay
      ? new Date(`${endDate || startDate}T23:59:59`).toISOString()
      : new Date(`${endDate || startDate}T${endTime}:00`).toISOString();

    if (new Date(endISO) < new Date(startISO)) {
      toast.error('La fin doit être après le début');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      starts_at: startISO,
      ends_at: endISO,
      all_day: allDay,
      reminder_minutes: reminder === 'none' ? null : Number(reminder),
      location_channel_id: locationChannelId === 'none' ? null : locationChannelId,
      thumbnail_url: thumbnailUrl,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (e: any) {
      // toast is also handled in the hook; surface code if available
      const msg = [e?.message, e?.code].filter(Boolean).join(' • ');
      if (msg) toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await remove.mutateAsync(editing.id);
      onOpenChange(false);
    } catch {}
  };

  const isPending = create.isPending || update.isPending || remove.isPending;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Modifier l’événement' : 'Nouvel événement'}
      className="w-[95vw] max-w-5xl max-h-[90vh] h-[90vh] flex flex-col"
      fullscreenOnMobile
    >
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
          {/* Left: Thumbnail */}
          <div className="flex flex-col">
            <Label>Miniature</Label>
            {pendingFile ? (
              <div className="mt-2">
                <ThumbnailCanvasEditor
                  file={pendingFile}
                  onCancel={() => setPendingFile(null)}
                  onConfirm={handleApplyCrop}
                />
              </div>
            ) : (
              <div className="mt-2 relative aspect-square w-full rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                {thumbnailUrl ? (
                  <>
                    <img src={thumbnailUrl} alt="Miniature de l'événement" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => startResizingExisting()}
                        disabled={uploading}
                        className="p-1.5 rounded-md bg-background/80 hover:bg-background disabled:opacity-50"
                        aria-label="Redimensionner la miniature"
                      >
                        <Scaling className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 rounded-md bg-background/80 hover:bg-background"
                        aria-label="Re-éditer la miniature"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setThumbnailUrl(null)}
                        className="p-1.5 rounded-md bg-background/80 hover:bg-background"
                        aria-label="Supprimer la miniature"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-6"
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
                    <span className="text-sm">{uploading ? 'Envoi…' : 'Ajouter une image'}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePickFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>

          {/* Right: form fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="evt-title">Titre</Label>
              <Input id="evt-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Réunion d’équipe" />
            </div>

            <div>
              <Label htmlFor="evt-desc">Description</Label>
              <Textarea id="evt-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="evt-allday">Journée entière</Label>
              <Switch id="evt-allday" checked={allDay} onCheckedChange={setAllDay} />
            </div>

            {allDay ? (
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setEndDate(e.target.value);
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Début</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-2" />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-2" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Lieu (salon)</Label>
                <Select value={locationChannelId} onValueChange={setLocationChannelId}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {allChannels.map((c) => (
                      <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Rappel</Label>
                <Select value={reminder} onValueChange={setReminder}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REMINDER_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-2 -mx-6 -mb-6 px-6 py-3 border-t border-border bg-background">
        {editing ? (
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer
          </Button>
        ) : <div />}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isPending || !!pendingFile}>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
