import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServers } from '@/hooks/useServers';
import { useServerInvites } from '@/hooks/useInvites';
import { useMembers } from '@/hooks/useMembers';
import { useChannels } from '@/hooks/useChannels';
import { userKey } from '@/lib/userScope';

/*
 * Etat de la "Progression de la configuration" d'un serveur recent, partage
 * entre la checklist "Bienvenue sur <serveur>" du premier salon et la ligne
 * de progression sous l'en-tete de la liste des salons : une etape terminee
 * d'un cote fait avancer l'autre ("Etape 5 sur 6" -> "Etape 6 sur 6").
 *
 * Les etapes sans trace en base (telecharger l'app, ajouter une application,
 * voir les boosts) sont memorisees localement, par serveur ; un evenement
 * fenetre tient les deux affichages synchronises.
 */

export type ChecklistStepId = 'invite' | 'icon' | 'message' | 'download' | 'app' | 'boost';

export const SETUP_STEPS: { id: ChecklistStepId; label: string }[] = [
  { id: 'invite', label: 'Invite tes amis' },
  { id: 'icon', label: 'Personnalise ton serveur avec une icône' },
  { id: 'message', label: 'Envoie ton premier message' },
  { id: 'download', label: "Télécharge l'application" },
  { id: 'app', label: 'Ajoute ta première application' },
  { id: 'boost', label: 'Déverrouille des avantages pour tout le monde avec les Boosts' },
];

const STORAGE_PREFIX = 'server-welcome-checklist:';
const CHANGE_EVENT = 'server-setup-progress-change';
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

type StepMap = Partial<Record<ChecklistStepId, boolean>>;

function readLocalSteps(serverId: string | null): StepMap {
  if (!serverId) return {};
  try {
    const raw = localStorage.getItem(userKey(STORAGE_PREFIX + serverId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export const firstMessageQueryKey = (serverId: string | null, userId: string | undefined) => ['server-setup-first-message', serverId, userId];

export function useServerSetupProgress(serverId: string | null) {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);

  // Proprietaire d'un serveur recent uniquement : sur un serveur etabli, les
  // etapes sans trace en base feraient reapparaitre la progression.
  const eligible =
    !!user && !!server && server.owner_id === user.id && !!server.created_at && Date.now() - new Date(server.created_at).getTime() < RECENT_MS;

  const { data: invites = [] } = useServerInvites(eligible ? serverId : null);
  const { data: members = [] } = useMembers(eligible ? serverId : null);
  const { data: hasMessage = false } = useQuery({
    queryKey: firstMessageQueryKey(serverId, user?.id),
    enabled: eligible,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, channels!inner(server_id)')
        .eq('channels.server_id', serverId!)
        .eq('author_id', user!.id)
        .limit(1);
      if (error) return false;
      return (data?.length ?? 0) > 0;
    },
  });

  const [localSteps, setLocalSteps] = useState<StepMap>(() => readLocalSteps(serverId));
  useEffect(() => {
    setLocalSteps(readLocalSteps(serverId));
    const sync = (e: Event) => {
      if ((e as CustomEvent<string>).detail === serverId) setLocalSteps(readLocalSteps(serverId));
    };
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [serverId]);

  const markLocal = useCallback(
    (id: ChecklistStepId) => {
      if (!serverId) return;
      const prev = readLocalSteps(serverId);
      if (prev[id]) return;
      try {
        localStorage.setItem(userKey(STORAGE_PREFIX + serverId), JSON.stringify({ ...prev, [id]: true }));
      } catch {
        /* stockage indisponible (navigation privee) */
      }
      setLocalSteps({ ...prev, [id]: true });
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: serverId }));
    },
    [serverId],
  );

  const done = useMemo<StepMap>(
    () => ({
      invite: invites.length > 0 || members.length > 1 || !!localSteps.invite,
      icon: !!server?.icon_url,
      message: hasMessage || !!localSteps.message,
      download: !!localSteps.download || isInstalledApp(),
      app: !!localSteps.app,
      boost: !!localSteps.boost,
    }),
    [invites.length, members.length, server?.icon_url, hasMessage, localSteps],
  );

  const doneCount = SETUP_STEPS.filter((s) => done[s.id]).length;
  const nextStep = SETUP_STEPS.find((s) => !done[s.id]) ?? null;
  const allDone = doneCount === SETUP_STEPS.length;

  return {
    /** Affichable : proprietaire d'un serveur recent, configuration inachevee. */
    visible: eligible && !allDone,
    eligible,
    done,
    doneCount,
    total: SETUP_STEPS.length,
    nextStep,
    allDone,
    markLocal,
  };
}

/** Premier salon textuel (hors categorie d'abord), qui accueille la checklist. */
export function useFirstTextChannelId(serverId: string | null) {
  const { data } = useChannels(serverId);
  return useMemo(() => {
    if (!data) return null;
    const byPos = <T extends { position: number | null }>(a: T, b: T) => (a.position ?? 0) - (b.position ?? 0);
    const ordered = [
      ...[...data.orphanChannels].sort(byPos),
      ...[...data.categories].sort(byPos).flatMap((c) => [...c.channels].sort(byPos)),
    ];
    return ordered.find((c) => c.type === 'text')?.id ?? null;
  }, [data]);
}
