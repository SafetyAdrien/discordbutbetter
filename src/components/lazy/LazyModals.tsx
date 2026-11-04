import { lazy, Suspense, useEffect, useState, type ComponentProps } from 'react';
import { OPEN_FORWARD_EVENT, type ForwardPayload } from '@/lib/forwardMessage';
import type { EventsModal as EventsModalT } from '@/components/events/EventsModal';
import type { ChannelSettingsModal as ChannelSettingsModalT } from '@/components/channel-settings/ChannelSettingsModal';
import type { MediaUploadModal as MediaUploadModalT } from '@/components/chat/upload/MediaUploadModal';
import type { ReminderTimeModal as ReminderTimeModalT } from '@/components/reminders/ReminderTimeModal';
import type { ServerProfileEditModal as ServerProfileEditModalT } from '@/components/profile/ServerProfileEditModal';
import type { ServerWelcomeChecklist as ServerWelcomeChecklistT } from '@/components/chat/ServerWelcomeChecklist';
import type { CustomThemeSheet as CustomThemeSheetT } from '@/components/appearance/CustomThemeSheet';
import type { DMConversation as DMConversationT } from '@/components/dm/DMConversation';
import type { InboxPanel as InboxPanelT } from '@/components/inbox/InboxPanel';
import type { ServerViewPage as ServerViewPageT } from '@/components/server-views/ServerViews';
import type { BoostBenefitsPage as BoostBenefitsPageT } from '@/components/server-settings/BoostBenefitsPage';

/*
 * Fenetres et pages lourdes chargees a la demande. Elles ne servent qu'apres une action de l'utilisateur (ouvrir les
 * evenements, les parametres d'un salon, l'envoi de medias, un rappel, les boosts) mais, importees statiquement,
 * elles alourdissaient le fichier principal : plus de JavaScript a telecharger, analyser et executer avant
 * l'affichage de l'application. Chaque composant garde exactement les memes props que l'original.
 */

const Events = lazy(() => import('@/components/events/EventsModal').then((m) => ({ default: m.EventsModal })));
const ChannelSettings = lazy(() => import('@/components/channel-settings/ChannelSettingsModal').then((m) => ({ default: m.ChannelSettingsModal })));
const MediaUpload = lazy(() => import('@/components/chat/upload/MediaUploadModal').then((m) => ({ default: m.MediaUploadModal })));
const ReminderTime = lazy(() => import('@/components/reminders/ReminderTimeModal').then((m) => ({ default: m.ReminderTimeModal })));
const ForwardShell = lazy(() => import('@/components/chat/ForwardMessageModal').then((m) => ({ default: m.ForwardMessageShell })));
const ServerProfileEdit = lazy(() => import('@/components/profile/ServerProfileEditModal').then((m) => ({ default: m.ServerProfileEditModal })));
const WelcomeChecklist = lazy(() => import('@/components/chat/ServerWelcomeChecklist').then((m) => ({ default: m.ServerWelcomeChecklist })));
const CustomTheme = lazy(() => import('@/components/appearance/CustomThemeSheet').then((m) => ({ default: m.CustomThemeSheet })));
const DMConv = lazy(() => import('@/components/dm/DMConversation').then((m) => ({ default: m.DMConversation })));
const Inbox = lazy(() => import('@/components/inbox/InboxPanel').then((m) => ({ default: m.InboxPanel })));
const ServerView = lazy(() => import('@/components/server-views/ServerViews').then((m) => ({ default: m.ServerViewPage })));
const BoostBenefits = lazy(() => import('@/components/server-settings/BoostBenefitsPage').then((m) => ({ default: m.BoostBenefitsPage })));

/** Prechargement discret quand le navigateur est inactif : la premiere ouverture est alors instantanee. */
export function preloadHeavyModals() {
  const run = () => {
    void import('@/components/channel-settings/ChannelSettingsModal');
    void import('@/components/chat/upload/MediaUploadModal');
    void import('@/components/events/EventsModal');
    void import('@/components/dm/DMConversation');
    void import('@/components/inbox/InboxPanel');
    void import('@/components/appearance/CustomThemeSheet');
  };
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 8000 });
  else window.setTimeout(run, 4000);
}

export function LazyEventsModal(props: ComponentProps<typeof EventsModalT>) {
  return <Suspense fallback={null}><Events {...props} /></Suspense>;
}

export function LazyChannelSettingsModal(props: ComponentProps<typeof ChannelSettingsModalT>) {
  return <Suspense fallback={null}><ChannelSettings {...props} /></Suspense>;
}

export function LazyServerProfileEditModal(props: ComponentProps<typeof ServerProfileEditModalT>) {
  return <Suspense fallback={null}><ServerProfileEdit {...props} /></Suspense>;
}

export function LazyServerWelcomeChecklist(props: ComponentProps<typeof ServerWelcomeChecklistT>) {
  return <Suspense fallback={null}><WelcomeChecklist {...props} /></Suspense>;
}

/** Ecoute l'evenement de transfert de message ; la fenetre elle-meme n'est telechargee qu'a la premiere ouverture. */
export function LazyForwardMessageHost() {
  const [payload, setPayload] = useState<ForwardPayload | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => setPayload((e as CustomEvent<ForwardPayload>).detail);
    window.addEventListener(OPEN_FORWARD_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FORWARD_EVENT, onOpen);
  }, []);
  return payload ? <Suspense fallback={null}><ForwardShell payload={payload} onClose={() => setPayload(null)} /></Suspense> : null;
}

export function LazyDMConversation(props: ComponentProps<typeof DMConversationT>) {
  return <Suspense fallback={null}><DMConv {...props} /></Suspense>;
}

export function LazyInboxPanel(props: ComponentProps<typeof InboxPanelT>) {
  return <Suspense fallback={null}><Inbox {...props} /></Suspense>;
}

export function LazyServerViewPage(props: ComponentProps<typeof ServerViewPageT>) {
  return <Suspense fallback={null}><ServerView {...props} /></Suspense>;
}

export function LazyBoostBenefitsPage(props: ComponentProps<typeof BoostBenefitsPageT>) {
  return <Suspense fallback={null}><BoostBenefits {...props} /></Suspense>;
}

/** Monte la fenetre a la premiere ouverture, puis la garde (l'animation de fermeture reste jouee). */
function useMountedOnOpen(open: boolean) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  return mounted || open;
}

export function LazyMediaUploadModal(props: ComponentProps<typeof MediaUploadModalT>) {
  const mounted = useMountedOnOpen(props.open);
  return mounted ? <Suspense fallback={null}><MediaUpload {...props} /></Suspense> : null;
}

export function LazyCustomThemeSheet(props: ComponentProps<typeof CustomThemeSheetT>) {
  const mounted = useMountedOnOpen(props.open);
  return mounted ? <Suspense fallback={null}><CustomTheme {...props} /></Suspense> : null;
}

export function LazyReminderTimeModal(props: ComponentProps<typeof ReminderTimeModalT>) {
  const mounted = useMountedOnOpen(props.open);
  return mounted ? <Suspense fallback={null}><ReminderTime {...props} /></Suspense> : null;
}
