import { useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { Hash, Pencil, X, MessageCircle } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { useDeleteReminder, useNow, useReminders, useUpdateReminderTime, type Reminder } from '@/hooks/useReminders';
import { relativeReminder } from '@/lib/reminders';
import { OPEN_SERVER_EVENT } from '@/lib/invites';
import { LazyReminderTimeModal as ReminderTimeModal } from '@/components/lazy/LazyModals';
import { toastReminderAdded } from './reminderToast';
import { InboxWatchIllustration } from '@/components/inbox/InboxIllustrations';
import { cn } from '@/lib/utils';

/*
 * Onglet "Rappels" de la boite de reception (video de reference) : un bloc par rappel, "Rappel dans 2 minutes"
 * (ou "Rappel en retard"), l'emplacement du message (icone du serveur › # salon, serveur › categorie) avec trois
 * boutons - modifier l'heure, aller au message, supprimer - puis le message tel qu'il etait. Triés par echeance.
 */

const squareBtn = 'h-9 w-9 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-[hsl(var(--icon-default))] hover:text-white flex items-center justify-center transition-colors';

function ReminderCard({ r, now, onClose }: { r: Reminder; now: Date; onClose?: () => void }) {
  const [editing, setEditing] = useState(false);
  const update = useUpdateReminderTime();
  const remove = useDeleteReminder();
  const rel = relativeReminder(r.remind_at, now);
  const s = r.snapshot;
  const isDM = r.source === 'dm';

  const go = () => {
    window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: isDM ? { serverId: null, conversationId: r.conversation_id } : { serverId: r.server_id, channelId: r.channel_id } }));
    onClose?.();
  };
  const tip = (label: string, btn: React.ReactNode) => (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <section className="rounded-lg bg-[#2f2f37] border border-white/[0.04] overflow-hidden">
      <p className={cn('h-[52px] flex items-center justify-center gap-2 text-base font-medium', rel.overdue ? 'text-[#f57976]' : 'text-[#dbdee1]')}>
        <Clock className="w-[18px] h-[18px]" /> {rel.text}
      </p>
      <div className="flex items-center gap-3 px-3 h-[60px] border-t border-white/[0.06] bg-[#34343c]">
        <span className="w-9 h-9 rounded-lg bg-white/[0.08] flex items-center justify-center overflow-hidden shrink-0 text-xs font-semibold text-white">
          {s.serverIcon ? <img src={s.serverIcon} alt="" className="w-full h-full object-cover" /> : (s.serverName ?? '#').slice(0, 2).toUpperCase()}
        </span>
        <span className="text-[hsl(var(--icon-default))] text-lg leading-none">›</span>
        <div className="min-w-0 flex-1">
          <p translate="no" className="flex items-center gap-1 text-base font-semibold text-white leading-5 truncate">
            {!isDM && <Hash className="w-4 h-4 shrink-0 text-[hsl(var(--icon-default))]" />}
            <span className="truncate">{s.channelName ?? 'Message'}</span>
          </p>
          <p translate="no" className="text-xs text-[#b5bac1] leading-4 truncate">
            {[s.serverName, s.categoryName].filter(Boolean).join(' › ')}
          </p>
        </div>
        {tip('Modifier le rappel', <button type="button" aria-label="Modifier le rappel" onClick={() => setEditing(true)} className={squareBtn}><Pencil className="w-[18px] h-[18px]" /></button>)}
        {tip('Aller au message', <button type="button" aria-label="Aller au message" onClick={go} className={squareBtn}><MessageCircle className="w-[18px] h-[18px]" /></button>)}
        {tip('Supprimer le rappel', <button type="button" aria-label="Supprimer le rappel" onClick={() => remove.mutate(r.id)} className={squareBtn}><X className="w-[18px] h-[18px]" /></button>)}
      </div>
      <div className="flex gap-3 p-4">
        <UserAvatarImage src={s.authorAvatar ?? null} alt="" className="w-10 h-10 shrink-0" fallbackClassName="bg-primary/20 text-primary" fallback={(s.authorName || '?').charAt(0).toUpperCase()} ownerId={s.authorId ?? undefined} />
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span translate="no" className="text-base font-semibold text-white">{s.authorName}</span>
            <span className="text-xs text-[#b5bac1]">{new Date(s.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
          {s.content && <p translate="no" className="text-base leading-[22px] text-[#dbdee1] break-words whitespace-pre-wrap">{s.content}</p>}
          {s.imageUrl && <img src={s.imageUrl} alt="" className="mt-1 max-h-[220px] rounded-lg object-cover" />}
        </div>
      </div>
      <ReminderTimeModal
        open={editing}
        onOpenChange={setEditing}
        initial={new Date(r.remind_at)}
        onSave={(at) => update.mutate({ id: r.id, remindAt: at }, { onSuccess: () => toastReminderAdded('Rappel modifié.') })}
      />
    </section>
  );
}

export function RemindersTab({ onClose }: { onClose?: () => void }) {
  const { data = [], isLoading } = useReminders();
  const now = useNow(15_000);

  if (isLoading) return <div role="status" className="flex items-center justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 pt-10 pb-10">
        <InboxWatchIllustration className="h-28 w-24" />
        <h3 className="mt-5 text-[26px] leading-8 font-semibold text-white text-center">Garde tout organisé, n’oublie jamais de répondre</h3>
        <p className="mt-3 max-w-[620px] text-center text-sm leading-[18px] text-foreground">
          Fais un clic droit sur n’importe quel message et sélectionne <b className="font-semibold text-white">Créer un rappel</b>. Nous te le rappellerons ici quand ce sera le moment.
        </p>
      </div>
    );
  }
  return (
    <div className="p-5 space-y-3">
      {data.map((r) => <ReminderCard key={r.id} r={r} now={now} onClose={onClose} />)}
    </div>
  );
}
