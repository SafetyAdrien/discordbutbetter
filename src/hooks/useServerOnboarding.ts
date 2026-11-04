import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

/*
 * Processus d'accueil d'un serveur (table server_onboarding) : salons par
 * defaut, questions de personnalisation et guide du serveur.
 */

export interface OnboardingOption {
  id: string;
  title: string;
  description: string;
  emoji: string | null;
  channel_ids: string[];
  role_ids: string[];
}

export interface OnboardingPrompt {
  id: string;
  title: string;
  required: boolean;
  multiple: boolean;
  /** Question anticipee (avant de rejoindre) ou complementaire (apres). */
  pre_join: boolean;
  options: OnboardingOption[];
}

export interface OnboardingGuide {
  welcome?: string;
  tasks?: { id: string; title: string; channel_id: string | null; emoji: string | null }[];
  resources?: { id: string; title: string; channel_id: string | null; description?: string }[];
}

export interface ServerOnboarding {
  server_id: string;
  enabled: boolean;
  default_channel_ids: string[];
  prompts: OnboardingPrompt[];
  guide: OnboardingGuide;
}

const key = (serverId: string) => ['server-onboarding', serverId] as const;

export function emptyOnboarding(serverId: string): ServerOnboarding {
  return { server_id: serverId, enabled: false, default_channel_ids: [], prompts: [], guide: {} };
}

export function useServerOnboarding(serverId: string | null) {
  return useQuery({
    queryKey: key(serverId ?? ''),
    enabled: !!serverId,
    queryFn: async (): Promise<ServerOnboarding> => {
      const { data, error } = await supabase.from('server_onboarding').select('*').eq('server_id', serverId!).maybeSingle();
      if (error || !data) return emptyOnboarding(serverId!);
      return {
        server_id: data.server_id,
        enabled: data.enabled,
        default_channel_ids: data.default_channel_ids ?? [],
        prompts: (data.prompts as unknown as OnboardingPrompt[]) ?? [],
        guide: (data.guide as unknown as OnboardingGuide) ?? {},
      };
    },
  });
}

export function useSaveServerOnboarding(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ServerOnboarding, 'server_id'>>) => {
      const { prompts, guide, ...rest } = patch;
      const row = {
        server_id: serverId,
        ...rest,
        ...(prompts ? { prompts: prompts as unknown as Json } : {}),
        ...(guide ? { guide: guide as unknown as Json } : {}),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('server_onboarding').upsert(row);
      if (error) throw error;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key(serverId) });
      const prev = qc.getQueryData<ServerOnboarding>(key(serverId));
      qc.setQueryData(key(serverId), { ...(prev ?? emptyOnboarding(serverId)), ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(key(serverId), ctx.prev);
      toast.error("Impossible d'enregistrer le processus d'accueil");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(serverId) }),
  });
}
