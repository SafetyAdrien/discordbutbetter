import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { ContextMenuItem, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from '@/components/ui/context-menu';
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { useDeleteReminder, useReminderFor, useSaveReminder, useUpdateReminderTime, type ReminderTarget } from '@/hooks/useReminders';
import { REMINDER_PRESETS } from '@/lib/reminders';
import { LazyReminderTimeModal as ReminderTimeModal } from '@/components/lazy/LazyModals';
import { toastReminderAdded } from './reminderToast';
import { toast } from 'sonner';

/*
 * "Créer un rappel" / "Modifier le rappel" dans le menu d'un message (video de reference) : sous-menu
 * "Rappelle-moi" avec dans 30 m, dans 1 h, dans 4 h, Demain à 9 h 00, Lundi à 9 h 00 et Personnalisé… (fenetre
 * date + heure). Quand le message a deja un rappel, le sous-menu propose aussi de le supprimer.
 */

/* La fenetre "Personnalise" vit hors du menu (qui se demonte a la selection) : evenement + hote unique. */
export const OPEN_REMINDER_MODAL_EVENT = 'app:open-reminder-modal';

export function ReminderModalHost() {
  const [target, setTarget] = useState<ReminderTarget | null>(null);
  const [open, setOpen] = useState(false);
  const existing = useReminderFor(target?.messageId);
  const save = useSaveReminder();
  const update = useUpdateReminderTime();

  useEffect(() => {
    const on = (e: Event) => { setTarget((e as CustomEvent<ReminderTarget>).detail); setOpen(true); };
    window.addEventListener(OPEN_REMINDER_MODAL_EVENT, on);
    return () => window.removeEventListener(OPEN_REMINDER_MODAL_EVENT, on);
  }, []);

  const apply = (at: Date) => {
    if (!target) return;
    const done = () => toastReminderAdded(existing ? 'Rappel modifié.' : 'Rappel ajouté.');
    const fail = () => toast.error("Impossible d'enregistrer le rappel");
    if (existing) update.mutate({ id: existing.id, remindAt: at }, { onSuccess: done, onError: fail });
    else save.mutate({ target, remindAt: at }, { onSuccess: done, onError: fail });
  };
  return <ReminderTimeModal open={open} onOpenChange={setOpen} initial={existing ? new Date(existing.remind_at) : null} onSave={apply} />;
}

function useReminderActions(target: ReminderTarget | undefined) {
  const existing = useReminderFor(target?.messageId);
  const save = useSaveReminder();
  const update = useUpdateReminderTime();
  const remove = useDeleteReminder();

  const apply = (at: Date) => {
    if (!target) return;
    const done = () => toastReminderAdded(existing ? 'Rappel modifié.' : 'Rappel ajouté.');
    const fail = () => toast.error("Impossible d'enregistrer le rappel");
    if (existing) update.mutate({ id: existing.id, remindAt: at }, { onSuccess: done, onError: fail });
    else save.mutate({ target, remindAt: at }, { onSuccess: done, onError: fail });
  };
  const setCustomOpen = () => target && window.dispatchEvent(new CustomEvent(OPEN_REMINDER_MODAL_EVENT, { detail: target }));
  return { existing, apply, setCustomOpen, remove, modal: null as React.ReactNode };
}

const LABEL = 'text-[#9b9ba8] text-sm font-medium cursor-default select-none px-2 h-9 flex items-center';

export function ReminderContextSubmenu({ target, triggerClassName, icon }: { target?: ReminderTarget; triggerClassName?: string; icon?: React.ReactNode }) {
  const a = useReminderActions(target);
  if (!target) return null;
  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger className={triggerClassName}>
          {icon ?? <Clock className="w-4 h-4 mr-2" />}
          {a.existing ? 'Modifier le rappel' : 'Créer un rappel'}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-[220px] p-2">
          <div className={LABEL}>Rappelle-moi</div>
          {REMINDER_PRESETS.map((p) => (
            <ContextMenuItem key={p.id} className="h-10 px-2" onSelect={() => a.apply(p.at(new Date()))}>{p.label}</ContextMenuItem>
          ))}
          <ContextMenuItem className="h-10 px-2" onSelect={() => setTimeout(() => a.setCustomOpen(), 0)}>Personnalisé…</ContextMenuItem>
          {a.existing && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem className="h-10 px-2 text-destructive focus:text-destructive" onSelect={() => a.remove.mutate(a.existing!.id)}>Supprimer le rappel</ContextMenuItem>
            </>
          )}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {a.modal}
    </>
  );
}

export function ReminderDropdownSubmenu({ target }: { target?: ReminderTarget }) {
  const a = useReminderActions(target);
  if (!target) return null;
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Clock className="w-4 h-4 mr-2" />
          {a.existing ? 'Modifier le rappel' : 'Créer un rappel'}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-[220px] p-2">
          <div className={LABEL}>Rappelle-moi</div>
          {REMINDER_PRESETS.map((p) => (
            <DropdownMenuItem key={p.id} className="h-10 px-2" onSelect={() => a.apply(p.at(new Date()))}>{p.label}</DropdownMenuItem>
          ))}
          <DropdownMenuItem className="h-10 px-2" onSelect={() => setTimeout(() => a.setCustomOpen(), 0)}>Personnalisé…</DropdownMenuItem>
          {a.existing && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="h-10 px-2 text-destructive focus:text-destructive" onSelect={() => a.remove.mutate(a.existing!.id)}>Supprimer le rappel</DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {a.modal}
    </>
  );
}
