import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cacheGetSync, cacheSetAsync } from '@/lib/cache';
import type { Database } from '@/integrations/supabase/types';

export interface ServerSettings {
  id: string;
  server_id: string;
  welcome_message: string | null;
  welcome_channel_id: string | null;
  system_channel_id: string | null;
  sticker_channel_id: string | null;
  boost_channel_id: string | null;
  tips_channel_id: string | null;
  activity_channel_id: string | null;
  auto_assign_roles: string[];
  system_messages_enabled: boolean;
  sticker_reply_enabled: boolean;
  boost_message_enabled: boolean;
  setup_tips_enabled: boolean;
  activity_feed_enabled: boolean;
  flexible_channel_names: boolean;
  // Acces / Securite / AutoMod / Communaute (migration 20261023000000).
  age_restricted: boolean;
  rules_enabled: boolean;
  rules: string[];
  verification_level: VerificationLevel;
  invites_paused_until: string | null;
  community_enabled: boolean;
  rules_channel_id: string | null;
  updates_channel_id: string | null;
  safety_alerts_channel_id: string | null;
  preferred_locale: string;
  automod_rules: AutoModRules;
  // Protection MP / spams, permissions, profil (migration 20261023120000).
  hide_suspicious_dms: boolean;
  filter_unknown_dms: boolean;
  warn_external_links: boolean;
  hide_spammer_messages: boolean;
  require_mod_2fa: boolean;
  restrict_prune_to_admins: boolean;
  profile_banner_preset: string | null;
  profile_traits: ProfileTrait[];
}

export interface ProfileTrait {
  emoji?: string;
  label: string;
}

export type VerificationLevel = 'none' | 'low' | 'medium' | 'high';

export interface AutoModRules {
  mention_spam: { enabled: boolean; limit: number };
  custom: { enabled: boolean; keywords: string[]; allow: string[] };
}

export const DEFAULT_AUTOMOD_RULES: AutoModRules = {
  mention_spam: { enabled: false, limit: 20 },
  custom: { enabled: false, keywords: [], allow: [] },
};

function normalizeAutoMod(raw: unknown): AutoModRules {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AutoModRules>;
  return {
    mention_spam: { ...DEFAULT_AUTOMOD_RULES.mention_spam, ...(r.mention_spam ?? {}) },
    custom: { ...DEFAULT_AUTOMOD_RULES.custom, ...(r.custom ?? {}) },
  };
}

export function useServerSettings(serverId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const instanceIdRef = useRef(Math.random().toString(36).slice(2));

  // Realtime subscription for server_settings changes
  useEffect(() => {
    if (!serverId || !user) return;

    const channel = supabase
      .channel(`server-settings-rt-${serverId}-${instanceIdRef.current}`, { config: { private: true } })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'server_settings', filter: `server_id=eq.${serverId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['server-settings', serverId] });
          }, 300);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [serverId, user, queryClient]);

  const query = useQuery({
    queryKey: ['server-settings', serverId],
    placeholderData: () => cacheGetSync(`server-settings:${serverId}`),
    queryFn: async (): Promise<ServerSettings | null> => {
      const { data, error } = await supabase
        .from('server_settings')
        .select('*')
        .eq('server_id', serverId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        return {
          ...data,
          system_channel_id: data.system_channel_id || null,
          sticker_channel_id: data.sticker_channel_id || null,
          boost_channel_id: data.boost_channel_id || null,
          tips_channel_id: data.tips_channel_id || null,
          activity_channel_id: data.activity_channel_id || null,
          sticker_reply_enabled: data.sticker_reply_enabled ?? true,
          boost_message_enabled: data.boost_message_enabled ?? true,
          setup_tips_enabled: data.setup_tips_enabled ?? true,
          activity_feed_enabled: data.activity_feed_enabled ?? true,
          flexible_channel_names: data.flexible_channel_names ?? true,
          age_restricted: data.age_restricted ?? false,
          rules_enabled: data.rules_enabled ?? false,
          rules: Array.isArray(data.rules) ? (data.rules as unknown[]).filter((r): r is string => typeof r === 'string') : [],
          verification_level: (data.verification_level as VerificationLevel) ?? 'none',
          invites_paused_until: data.invites_paused_until ?? null,
          community_enabled: data.community_enabled ?? false,
          rules_channel_id: data.rules_channel_id ?? null,
          updates_channel_id: data.updates_channel_id ?? null,
          safety_alerts_channel_id: data.safety_alerts_channel_id ?? null,
          preferred_locale: data.preferred_locale ?? 'fr',
          automod_rules: normalizeAutoMod(data.automod_rules),
          hide_suspicious_dms: data.hide_suspicious_dms ?? true,
          filter_unknown_dms: data.filter_unknown_dms ?? true,
          warn_external_links: data.warn_external_links ?? true,
          hide_spammer_messages: data.hide_spammer_messages ?? true,
          require_mod_2fa: data.require_mod_2fa ?? false,
          restrict_prune_to_admins: data.restrict_prune_to_admins ?? true,
          profile_banner_preset: data.profile_banner_preset ?? null,
          profile_traits: Array.isArray(data.profile_traits)
            ? (data.profile_traits as unknown[]).filter((t): t is ProfileTrait => !!t && typeof (t as ProfileTrait).label === 'string')
            : [],
        };
      }
      return null;
    },
    enabled: !!serverId && !!user,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (query.data && serverId && !query.isPlaceholderData) {
      cacheSetAsync(`server-settings:${serverId}`, query.data);
    }
  }, [query.data, serverId, query.isPlaceholderData]);

  return query;
}

export function useUpdateServerSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      serverId,
      settings,
    }: {
      serverId: string;
      settings: Partial<Omit<ServerSettings, 'id' | 'server_id'>>;
    }) => {
      // Try to update first
      const { data: existing } = await supabase
        .from('server_settings')
        .select('id')
        .eq('server_id', serverId)
        .maybeSingle();

      // Les colonnes jsonb (rules, automod_rules) sont typees `Json` cote client.
      const payload = settings as unknown as Database['public']['Tables']['server_settings']['Update'];
      if (existing) {
        const { error } = await supabase
          .from('server_settings')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('server_id', serverId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('server_settings')
          .insert({ ...payload, server_id: serverId });
        if (error) throw error;
      }

      return { serverId };
    },
    onMutate: async ({ serverId, settings }) => {
      await queryClient.cancelQueries({ queryKey: ['server-settings', serverId] });
      const previousSettings = queryClient.getQueryData(['server-settings', serverId]);
      
      queryClient.setQueryData(['server-settings', serverId], (old: ServerSettings | null | undefined) => {
        if (!old) {
          return {
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            server_id: serverId,
            welcome_message: settings.welcome_message ?? null,
            welcome_channel_id: settings.welcome_channel_id ?? null,
            system_channel_id: settings.system_channel_id ?? null,
            sticker_channel_id: settings.sticker_channel_id ?? null,
            boost_channel_id: settings.boost_channel_id ?? null,
            tips_channel_id: settings.tips_channel_id ?? null,
            activity_channel_id: settings.activity_channel_id ?? null,
            auto_assign_roles: settings.auto_assign_roles ?? [],
            system_messages_enabled: settings.system_messages_enabled ?? true,
            sticker_reply_enabled: settings.sticker_reply_enabled ?? true,
            boost_message_enabled: settings.boost_message_enabled ?? true,
            setup_tips_enabled: settings.setup_tips_enabled ?? true,
            activity_feed_enabled: settings.activity_feed_enabled ?? true,
            flexible_channel_names: settings.flexible_channel_names ?? true,
            age_restricted: settings.age_restricted ?? false,
            rules_enabled: settings.rules_enabled ?? false,
            rules: settings.rules ?? [],
            verification_level: settings.verification_level ?? 'none',
            invites_paused_until: settings.invites_paused_until ?? null,
            community_enabled: settings.community_enabled ?? false,
            rules_channel_id: settings.rules_channel_id ?? null,
            updates_channel_id: settings.updates_channel_id ?? null,
            safety_alerts_channel_id: settings.safety_alerts_channel_id ?? null,
            preferred_locale: settings.preferred_locale ?? 'fr',
            automod_rules: settings.automod_rules ?? DEFAULT_AUTOMOD_RULES,
          };
        }
        return { ...old, ...settings };
      });
      
      return { previousSettings };
    },
    onError: (_, variables, context) => {
      if (context?.previousSettings !== undefined) {
        queryClient.setQueryData(['server-settings', variables.serverId], context.previousSettings);
      }
      toast.error('Erreur lors de la sauvegarde');
    },
    onSuccess: () => {
    },
    onSettled: (_, __, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: ['server-settings', serverId] });
    },
  });
}
