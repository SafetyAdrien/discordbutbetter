import { useState, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PreloadStep {
  label: string;
  key: string;
  loaded: boolean;
}

interface PreloaderResult {
  ready: boolean;
  progress: number; // 0-100
  currentStep: string;
  steps: PreloadStep[];
}

/**
 * Détecte la qualité de connexion et retourne un délai minimum adapté
 */
function getMinLoadingMs(): number {
  const nav = navigator as any;
  if (nav.connection) {
    const effectiveType = nav.connection.effectiveType;
    // slow-2g, 2g → 4s min ; 3g → 2.5s ; 4g → 1.5s
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return 4000;
    if (effectiveType === '3g') return 2500;
    return 1500;
  }
  return 1800; // fallback
}

/**
 * Précharge toutes les données critiques de l'app :
 * auth, serveurs, salons, membres, permissions, DMs, profil
 */
export function usePreloader(
  authLoading: boolean,
  serversPending: boolean,
  servers: { id: string }[],
): PreloaderResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [serversLoaded, setServersLoaded] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [dmsLoaded, setDmsLoaded] = useState(false);
  const [serverOrderLoaded, setServerOrderLoaded] = useState(false);
  const [channelPermsLoaded, setChannelPermsLoaded] = useState(false);
  const [serverMessagesLoaded, setServerMessagesLoaded] = useState(false);
  const [dmMessagesLoaded, setDmMessagesLoaded] = useState(false);
  const [threadMessagesLoaded, setThreadMessagesLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  const hasStarted = useRef(false);

  // Min loading timer (adapté à la connexion)
  useEffect(() => {
    const ms = getMinLoadingMs();
    const timer = setTimeout(() => setMinTimePassed(true), ms);
    return () => clearTimeout(timer);
  }, []);

  // Mark servers loaded when query resolves
  useEffect(() => {
    if (!serversPending && !authLoading && user) {
      setServersLoaded(true);
    }
  }, [serversPending, authLoading, user]);

  // Preload all data once servers are loaded
  useEffect(() => {
    if (!serversLoaded || !user || hasStarted.current) return;
    hasStarted.current = true;

    const preload = async () => {
      const serverIds = servers.map(s => s.id);

      // 1. Preload profile + server order
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile) {
          queryClient.setQueryData(['profile', user.id], profile);
          // Seed server order cache from profile
          queryClient.setQueryData(['server-order', user.id], profile.server_order || []);
        }
      } catch {}
      setProfileLoaded(true);
      setServerOrderLoaded(true);

      // 2. Preload channels for ALL servers
      try {
        const channelPromises = serverIds.map(async (sid) => {
          const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .eq('server_id', sid)
            .order('position');
          const { data: channels } = await supabase
            .from('channels')
            .select('*')
            .eq('server_id', sid)
            .order('position');
          // Seed the cache
          if (categories && channels) {
            const categorized = (categories || []).map(cat => ({
              id: cat.id,
              name: cat.name,
              position: cat.position,
              channels: (channels || [])
                .filter(ch => ch.category_id === cat.id)
                .map(ch => ({
                  id: ch.id,
                  name: ch.name,
                  type: ch.type,
                  description: ch.description,
                  position: ch.position,
                  category_id: ch.category_id,
                  server_id: ch.server_id,
                })),
            }));
            const orphans = (channels || [])
              .filter(ch => !ch.category_id)
              .map(ch => ({
                id: ch.id,
                name: ch.name,
                type: ch.type,
                description: ch.description,
                position: ch.position,
                category_id: null,
                server_id: ch.server_id,
              }));
            queryClient.setQueryData(['channels', sid], {
              categories: categorized,
              orphanChannels: orphans,
            });
          }
        });
        await Promise.all(channelPromises);
      } catch {}
      setChannelsLoaded(true);

      // 3. Preload members for ALL servers (with roles + server profiles)
      try {
        const memberPromises = serverIds.map(async (sid) => {
          const { data } = await supabase
            .from('server_members')
            .select(`
              id, nickname, joined_at,
              user:profiles!server_members_user_id_fkey (
                id, username, display_name, avatar_url, banner_url,
                status, custom_status, bio, pronouns,
                activity_type, activity_text
              ),
              member_roles (
                role:roles (
                  id, name, color, icon_url, position, description
                )
              )
            `)
            .eq('server_id', sid);
          if (data) {
            // Fetch server profiles
            const userIds = data.map((m: any) => m.user?.id).filter(Boolean);
            const { data: serverProfiles } = userIds.length > 0
              ? await supabase
                  .from('server_profiles')
                  .select('id, user_id, server_id, display_name, avatar_url, banner_url, bio, pronouns')
                  .eq('server_id', sid)
                  .in('user_id', userIds)
              : { data: [] as any[] };

            const profileMap = new Map<string, any>();
            serverProfiles?.forEach((sp: any) => profileMap.set(sp.user_id, sp));

            // Transform to MemberWithProfile format
            const members = data.map((member: any) => ({
              id: member.id,
              nickname: member.nickname,
              joined_at: member.joined_at,
              user: member.user,
              roles: (member.member_roles || [])
                .map((mr: any) => mr.role)
                .filter((r: any) => r !== null)
                .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0)),
              serverProfile: profileMap.get(member.user?.id) ?? null,
            }));
            queryClient.setQueryData(['members', sid], members);
          }
        });
        await Promise.all(memberPromises);
      } catch {}
      setMembersLoaded(true);

      // 4. Preload roles + permissions for all servers
      try {
        const permPromises = serverIds.map(async (sid) => {
          const { data: roles } = await supabase
            .from('roles')
            .select('id, name, color, icon_url, position, is_default, hoist, server_id, description')
            .eq('server_id', sid)
            .order('position', { ascending: false });
          if (roles) {
            const roleIds = roles.map(r => r.id);
            const { data: permissions } = await supabase
              .from('role_permissions')
              .select('role_id, permission')
              .in('role_id', roleIds);
            const rolesWithPerms = roles.map(role => ({
              ...role,
              permissions: (permissions || [])
                .filter(p => p.role_id === role.id)
                .map(p => p.permission),
            }));
            queryClient.setQueryData(['roles', sid], rolesWithPerms);
          }
        });
        await Promise.all(permPromises);
      } catch {}
      setPermissionsLoaded(true);

      // 5. Preload DM conversations
      try {
        const { data: participants } = await supabase
          .from('dm_participants')
          .select('conversation_id')
          .eq('user_id', user.id);
        if (participants) {
          const convIds = participants.map(p => p.conversation_id);
          if (convIds.length > 0) {
            const { data: conversations } = await supabase
              .from('dm_conversations')
              .select('*')
              .in('id', convIds);
            if (conversations) {
              queryClient.setQueryData(['dm-conversations'], conversations);
            }
          }
        }
      } catch {}
      setDmsLoaded(true);

      // 6. Preload channel permissions for ALL servers
      try {
        const chPermPromises = serverIds.map(async (sid) => {
          const { data } = await supabase.rpc('get_server_channel_permissions', {
            _user_id: user.id,
            _server_id: sid,
          });
          const viewable = new Set<string>();
          const connectable = new Set<string>();
          (data || []).forEach((row: { channel_id: string; can_view: boolean; can_connect: boolean }) => {
            if (row.can_view) viewable.add(row.channel_id);
            if (row.can_connect) connectable.add(row.channel_id);
          });
          queryClient.setQueryData(['server-channel-permissions', sid, user.id], { viewable, connectable });
        });
        await Promise.all(chPermPromises);
      } catch {}
      setChannelPermsLoaded(true);
    };

    preload();
  }, [serversLoaded, user, servers, queryClient]);

  const steps: PreloadStep[] = useMemo(() => [
    { label: 'Authentification', key: 'auth', loaded: !authLoading },
    { label: 'Serveurs', key: 'servers', loaded: serversLoaded },
    { label: 'Profil', key: 'profile', loaded: profileLoaded },
    { label: 'Organisation', key: 'serverOrder', loaded: serverOrderLoaded },
    { label: 'Salons', key: 'channels', loaded: channelsLoaded },
    { label: 'Membres', key: 'members', loaded: membersLoaded },
    { label: 'Permissions', key: 'permissions', loaded: permissionsLoaded },
    { label: 'Permissions salons', key: 'channelPerms', loaded: channelPermsLoaded },
    { label: 'Messages privés', key: 'dms', loaded: dmsLoaded },
  ], [authLoading, serversLoaded, profileLoaded, serverOrderLoaded, channelsLoaded, membersLoaded, permissionsLoaded, channelPermsLoaded, dmsLoaded]);

  const loadedCount = steps.filter(s => s.loaded).length;
  const progress = Math.round((loadedCount / steps.length) * 100);
  const currentStep = steps.find(s => !s.loaded)?.label || 'Finalisation';
  const allLoaded = steps.every(s => s.loaded);
  const ready = allLoaded && minTimePassed;

  return { ready, progress, currentStep, steps };
}
