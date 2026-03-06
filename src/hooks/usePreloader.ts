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
  progress: number;
  currentStep: string;
  steps: PreloadStep[];
}

/** Try to read from sessionStorage, return parsed data or null */
function readCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Write to sessionStorage, silently ignore quota errors */
function writeCache(key: string, data: unknown): void {
  try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
}

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

  // Adaptive min loading: instant if cache exists, otherwise short delay
  useEffect(() => {
    const hasPreviousLoad = sessionStorage.getItem('cache:preloader-done');
    if (hasPreviousLoad) {
      setMinTimePassed(true);
      return;
    }
    const timer = setTimeout(() => setMinTimePassed(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // Mark servers loaded when query resolves
  useEffect(() => {
    if (!serversPending && !authLoading && user) {
      setServersLoaded(true);
    }
  }, [serversPending, authLoading, user]);

  // Preload all data once servers are loaded — PARALLELIZED
  useEffect(() => {
    if (!serversLoaded || !user || hasStarted.current) return;
    hasStarted.current = true;

    const serverIds = servers.map(s => s.id);

    // GROUP 1: Profile + server order
    const profilePromise = (async () => {
      const cached = readCache<any>(`cache:profile:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['profile', user.id], cached);
        queryClient.setQueryData(['server-order', user.id], cached.server_order || []);
      } else {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          if (profile) {
            queryClient.setQueryData(['profile', user.id], profile);
            queryClient.setQueryData(['server-order', user.id], profile.server_order || []);
            writeCache(`cache:profile:${user.id}`, profile);
          }
        } catch {}
      }
      setProfileLoaded(true);
      setServerOrderLoaded(true);
    })();

    // GROUP 2: Channels for all servers
    const channelsPromise = (async () => {
      await Promise.all(serverIds.map(async (sid) => {
        const cached = readCache<any>(`cache:channels:${sid}`);
        if (cached) {
          queryClient.setQueryData(['channels', sid], cached);
          return;
        }
        try {
          const [{ data: categories }, { data: channels }] = await Promise.all([
            supabase.from('categories').select('*').eq('server_id', sid).order('position'),
            supabase.from('channels').select('*').eq('server_id', sid).order('position'),
          ]);
          if (categories && channels) {
            const result = {
              categories: categories.map(cat => ({
                id: cat.id, name: cat.name, position: cat.position,
                channels: channels.filter(ch => ch.category_id === cat.id).map(ch => ({
                  id: ch.id, name: ch.name, type: ch.type, description: ch.description,
                  position: ch.position, category_id: ch.category_id, server_id: ch.server_id,
                })),
              })),
              orphanChannels: channels.filter(ch => !ch.category_id).map(ch => ({
                id: ch.id, name: ch.name, type: ch.type, description: ch.description,
                position: ch.position, category_id: null, server_id: ch.server_id,
              })),
            };
            queryClient.setQueryData(['channels', sid], result);
            writeCache(`cache:channels:${sid}`, result);
          }
        } catch {}
      }));
      setChannelsLoaded(true);
    })();

    // GROUP 3: Members for all servers
    const membersPromise = (async () => {
      await Promise.all(serverIds.map(async (sid) => {
        const cached = readCache<any>(`cache:members:${sid}`);
        if (cached) {
          queryClient.setQueryData(['members', sid], cached);
          return;
        }
        try {
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
            const members = data.map((member: any) => ({
              id: member.id, nickname: member.nickname, joined_at: member.joined_at,
              user: member.user,
              roles: (member.member_roles || []).map((mr: any) => mr.role).filter((r: any) => r !== null)
                .sort((a: any, b: any) => (b.position ?? 0) - (a.position ?? 0)),
              serverProfile: profileMap.get(member.user?.id) ?? null,
            }));
            queryClient.setQueryData(['members', sid], members);
            writeCache(`cache:members:${sid}`, members);
          }
        } catch {}
      }));
      setMembersLoaded(true);
    })();

    // GROUP 4: Roles + permissions for all servers
    const permissionsPromise = (async () => {
      await Promise.all(serverIds.map(async (sid) => {
        const cached = readCache<any>(`cache:roles:${sid}`);
        if (cached) {
          queryClient.setQueryData(['roles', sid], cached);
          return;
        }
        try {
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
              permissions: (permissions || []).filter(p => p.role_id === role.id).map(p => p.permission),
            }));
            queryClient.setQueryData(['roles', sid], rolesWithPerms);
            writeCache(`cache:roles:${sid}`, rolesWithPerms);
          }
        } catch {}
      }));
      setPermissionsLoaded(true);
    })();

    // GROUP 5: DM conversations
    const dmsPromise = (async () => {
      const cached = readCache<any>(`cache:dm-conversations:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['dm-conversations'], cached);
      } else {
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
                writeCache(`cache:dm-conversations:${user.id}`, conversations);
              }
            }
          }
        } catch {}
      }
      setDmsLoaded(true);
    })();

    // GROUP 6: Channel permissions for all servers
    const channelPermsPromise = (async () => {
      await Promise.all(serverIds.map(async (sid) => {
        const cacheKey = `cache:channel-perms:${sid}:${user.id}`;
        const cached = readCache<any>(cacheKey);
        if (cached) {
          queryClient.setQueryData(['server-channel-permissions', sid, user.id], {
            viewable: new Set<string>(cached.viewable),
            connectable: new Set<string>(cached.connectable),
          });
          return;
        }
        try {
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
          writeCache(cacheKey, { viewable: [...viewable], connectable: [...connectable] });
        } catch {}
      }));
      setChannelPermsLoaded(true);
    })();

    // PHASE 2: After channels + DMs + channel perms resolved, preload messages + detailed perms
    const messagesPhase = Promise.all([channelsPromise, dmsPromise, channelPermsPromise]).then(async () => {
      // 6b. Detailed channel permissions (send_messages, manage_messages, etc.)
      const detailedPermsPromise = (async () => {
        try {
          const recentChannels = readCache<string[]>('cache:recent-channels') || [];
          const channelIdsForPerms = new Set<string>(recentChannels.slice(0, 30));

          // Also add first text channel per server
          for (const sid of serverIds) {
            const channelData = queryClient.getQueryData(['channels', sid]) as any;
            if (channelData) {
              const textTypes = ['text', 'announcement'];
              let found = false;
              for (const cat of (channelData.categories || [])) {
                for (const ch of (cat.channels || [])) {
                  if (textTypes.includes(ch.type)) {
                    channelIdsForPerms.add(ch.id);
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              if (!found) {
                for (const ch of (channelData.orphanChannels || [])) {
                  if (textTypes.includes(ch.type)) {
                    channelIdsForPerms.add(ch.id);
                    break;
                  }
                }
              }
            }
          }

          await Promise.all([...channelIdsForPerms].map(async (chId) => {
            // Check if already cached in sessionStorage
            const PERM_CACHE_PREFIX = 'perm:';
            const testKey = `${chId}:send_messages`;
            try {
              if (sessionStorage.getItem(PERM_CACHE_PREFIX + testKey) !== null) {
                // Already cached — inject into queryClient from sessionStorage
                const allPerms = [
                  'read_messages', 'send_messages', 'manage_messages',
                  'connect_voice', 'speak_voice', 'mention_everyone',
                  'manage_channels', 'manage_roles', 'kick_members',
                  'ban_members', 'manage_server', 'administrator',
                  'mute_members', 'move_members', 'create_invites'
                ];
                for (const perm of allPerms) {
                  const raw = sessionStorage.getItem(PERM_CACHE_PREFIX + `${chId}:${perm}`);
                  if (raw !== null) {
                    queryClient.setQueryData(
                      ['channel-permission', chId, perm, user.id],
                      { permission: perm, granted: raw === '1' }
                    );
                  }
                }
                // Also inject the permissions object cache
                const objRaw = sessionStorage.getItem(PERM_CACHE_PREFIX + 'obj:' + chId);
                if (objRaw) {
                  try {
                    queryClient.setQueryData(['user-channel-permissions', chId, user.id], JSON.parse(objRaw));
                  } catch {}
                }
                return;
              }
            } catch {}

            // Fetch from DB
            try {
              const { data } = await supabase.rpc('get_user_channel_permissions', {
                _user_id: user.id,
                _channel_id: chId,
              });
              if (data) {
                const permMap: Record<string, boolean> = {};
                (data as { permission: string; granted: boolean }[]).forEach(row => {
                  // Inject into queryClient
                  queryClient.setQueryData(
                    ['channel-permission', chId, row.permission, user.id],
                    { permission: row.permission, granted: row.granted }
                  );
                  // Write to sessionStorage
                  try {
                    sessionStorage.setItem(PERM_CACHE_PREFIX + `${chId}:${row.permission}`, row.granted ? '1' : '0');
                  } catch {}
                  permMap[row.permission] = row.granted;
                });
                // Also build and cache the permissions object
                const permsObj = {
                  canReadMessages: permMap['read_messages'] ?? false,
                  canSendMessages: permMap['send_messages'] ?? false,
                  canManageMessages: permMap['manage_messages'] ?? false,
                  canConnectVoice: permMap['connect_voice'] ?? false,
                  canSpeakVoice: permMap['speak_voice'] ?? false,
                  canMentionEveryone: permMap['mention_everyone'] ?? false,
                  canManageChannels: permMap['manage_channels'] ?? false,
                  canManageRoles: permMap['manage_roles'] ?? false,
                  isAdmin: permMap['administrator'] ?? false,
                };
                queryClient.setQueryData(['user-channel-permissions', chId, user.id], permsObj);
                try {
                  sessionStorage.setItem(PERM_CACHE_PREFIX + 'obj:' + chId, JSON.stringify(permsObj));
                } catch {}
              }
            } catch {}
          }));
        } catch {}
      })();

      // 7. Server messages — only active channel + last 5 visited per server
      const serverMsgPromise = (async () => {
        try {
          const recentChannels = readCache<string[]>('cache:recent-channels') || [];
          const channelIdsToLoad = new Set<string>(recentChannels.slice(0, 30));

          // Also add first text channel per server as fallback
          for (const sid of serverIds) {
            const channelData = queryClient.getQueryData(['channels', sid]) as any;
            if (channelData) {
              const textTypes = ['text', 'announcement'];
              let found = false;
              for (const cat of (channelData.categories || [])) {
                for (const ch of (cat.channels || [])) {
                  if (textTypes.includes(ch.type)) {
                    channelIdsToLoad.add(ch.id);
                    found = true;
                    break;
                  }
                }
                if (found) break;
              }
              if (!found) {
                for (const ch of (channelData.orphanChannels || [])) {
                  if (textTypes.includes(ch.type)) {
                    channelIdsToLoad.add(ch.id);
                    break;
                  }
                }
              }
            }
          }

          await Promise.all([...channelIdsToLoad].map(async (chId) => {
            // Skip if already in sessionStorage
            const cached = readCache<any>(`cache:messages:${chId}`);
            if (cached) {
              queryClient.setQueryData(['messages', chId], cached);
              return;
            }
            const { data } = await supabase
              .from('messages')
              .select(`
                id, content, created_at, edited_at, attachments, channel_id,
                source_server_id, source_server_name, source_server_icon,
                source_channel_name, is_published_message, publish_dismissed, is_system,
                author:profiles!messages_author_id_fkey (
                  id, username, display_name, avatar_url, status, custom_status
                )
              `)
              .eq('channel_id', chId)
              .order('created_at', { ascending: true })
              .limit(100);
            if (data) {
              const messages = (data as any[]).map(msg => ({
                ...msg,
                attachments: Array.isArray(msg.attachments) ? msg.attachments : []
              }));
              queryClient.setQueryData(['messages', chId], messages);
              writeCache(`cache:messages:${chId}`, messages);
            }
          }));
        } catch {}
        setServerMessagesLoaded(true);
      })();

      // 8. DM messages
      const dmMsgPromise = (async () => {
        try {
          const conversations = queryClient.getQueryData(['dm-conversations']) as any[] | undefined;
          if (conversations && conversations.length > 0) {
            await Promise.all(conversations.map(async (conv: any) => {
              const cached = readCache<any>(`cache:dm-messages:${conv.id}`);
              if (cached) {
                queryClient.setQueryData(['dm-messages', conv.id], cached);
                return;
              }
              const { data } = await supabase
                .from('dm_messages')
                .select(`
                  id, content, created_at, edited_at, attachments, conversation_id,
                  author:profiles!dm_messages_author_id_fkey (
                    id, username, display_name, avatar_url
                  )
                `)
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(100);
              if (data) {
                const messages = (data as any[]).map(msg => ({
                  ...msg,
                  attachments: Array.isArray(msg.attachments) ? msg.attachments : []
                }));
                queryClient.setQueryData(['dm-messages', conv.id], messages);
                writeCache(`cache:dm-messages:${conv.id}`, messages);
              }
            }));
          }
        } catch {}
        setDmMessagesLoaded(true);
      })();

      // 9. Thread messages (only followed)
      const threadMsgPromise = (async () => {
        try {
          const { data: followed } = await supabase
            .from('thread_followers')
            .select('thread_id')
            .eq('user_id', user.id);
          if (followed && followed.length > 0) {
            const threadIds = followed.map(f => f.thread_id);
            const { data: threads } = await supabase
              .from('threads')
              .select('id, channel_id, channels!threads_channel_id_fkey(server_id)')
              .in('id', threadIds)
              .eq('archived', false);
            const validThreadIds = (threads || [])
              .filter((t: any) => serverIds.includes(t.channels?.server_id))
              .map((t: any) => t.id);
            await Promise.all(validThreadIds.map(async (tid: string) => {
              const cached = readCache<any>(`cache:thread-messages:${tid}`);
              if (cached) {
                queryClient.setQueryData(['thread-messages', tid], cached);
                return;
              }
              const { data } = await supabase
                .from('thread_messages')
                .select(`
                  *, author:profiles!thread_messages_author_id_fkey(id, username, display_name, avatar_url)
                `)
                .eq('thread_id', tid)
                .order('created_at', { ascending: true });
              if (data) {
                queryClient.setQueryData(['thread-messages', tid], data);
                writeCache(`cache:thread-messages:${tid}`, data);
              }
            }));
          }
        } catch {}
        setThreadMessagesLoaded(true);
      })();

      // 10. Threads for loaded channels (background)
      const threadsPromise = (async () => {
        try {
          const channelIdsToLoad = new Set<string>();
          for (const sid of serverIds) {
            const channelData = queryClient.getQueryData(['channels', sid]) as any;
            if (channelData) {
              for (const cat of (channelData.categories || [])) {
                for (const ch of (cat.channels || [])) {
                  if (ch.type === 'text') channelIdsToLoad.add(ch.id);
                }
              }
              for (const ch of (channelData.orphanChannels || [])) {
                if (ch.type === 'text') channelIdsToLoad.add(ch.id);
              }
            }
          }
          await Promise.all([...channelIdsToLoad].map(async (chId) => {
            const cached = readCache<any>(`cache:threads:${chId}`);
            if (cached) {
              queryClient.setQueryData(['threads', chId], cached);
              return;
            }
            try {
              const { data } = await supabase
                .from('threads')
                .select('*, creator:profiles!threads_created_by_fkey(id, username, display_name, avatar_url)')
                .eq('channel_id', chId)
                .eq('archived', false)
                .order('last_message_at', { ascending: false });
              if (data) {
                queryClient.setQueryData(['threads', chId], data);
                writeCache(`cache:threads:${chId}`, data);
              }
            } catch {}
          }));
        } catch {}
      })();

      // 11. Polls for loaded channels (background)
      const pollsPromise = (async () => {
        try {
          const channelIdsToLoad = new Set<string>();
          for (const sid of serverIds) {
            const channelData = queryClient.getQueryData(['channels', sid]) as any;
            if (channelData) {
              for (const cat of (channelData.categories || [])) {
                for (const ch of (cat.channels || [])) {
                  if (ch.type === 'text') channelIdsToLoad.add(ch.id);
                }
              }
              for (const ch of (channelData.orphanChannels || [])) {
                if (ch.type === 'text') channelIdsToLoad.add(ch.id);
              }
            }
          }
          await Promise.all([...channelIdsToLoad].map(async (chId) => {
            const cached = readCache<any>(`cache:polls:channel:${chId}`);
            if (cached) {
              queryClient.setQueryData(['polls', 'channel', chId], cached);
              return;
            }
            try {
              const { data: polls } = await supabase
                .from('polls')
                .select('*, author:profiles!polls_author_id_fkey(id, display_name, avatar_url, username)')
                .eq('channel_id', chId)
                .is('thread_id', null)
                .order('created_at', { ascending: true });
              if (polls && polls.length > 0) {
                const pollsWithDetails = await Promise.all(
                  polls.map(async (poll) => {
                    const [optionsRes, votesRes] = await Promise.all([
                      supabase.from('poll_options').select('*').eq('poll_id', poll.id).order('position'),
                      supabase.from('poll_votes').select('*, user:profiles!poll_votes_user_id_fkey(id, display_name, avatar_url)').eq('poll_id', poll.id)
                    ]);
                    return { ...poll, options: optionsRes.data || [], votes: votesRes.data || [] };
                  })
                );
                queryClient.setQueryData(['polls', 'channel', chId], pollsWithDetails);
                writeCache(`cache:polls:channel:${chId}`, pollsWithDetails);
              } else if (polls) {
                queryClient.setQueryData(['polls', 'channel', chId], []);
                writeCache(`cache:polls:channel:${chId}`, []);
              }
            } catch {}
          }));
        } catch {}
      })();

      await Promise.all([serverMsgPromise, dmMsgPromise, threadMsgPromise, threadsPromise, pollsPromise]);

      // Prefetch all image attachments into browser cache (fire-and-forget)
      try {
        const imageUrls = new Set<string>();

        // Collect all message channel IDs from queryClient
        for (const sid of serverIds) {
          const channelData = queryClient.getQueryData(['channels', sid]) as any;
          if (channelData) {
            for (const cat of (channelData.categories || [])) {
              for (const ch of (cat.channels || [])) {
                const msgs = queryClient.getQueryData(['messages', ch.id]) as any[];
                msgs?.forEach(msg => {
                  (msg.attachments || []).forEach((a: any) => {
                    if (a.type === 'image' && a.url) imageUrls.add(a.url);
                  });
                });
              }
            }
            for (const ch of (channelData.orphanChannels || [])) {
              const msgs = queryClient.getQueryData(['messages', ch.id]) as any[];
              msgs?.forEach(msg => {
                (msg.attachments || []).forEach((a: any) => {
                  if (a.type === 'image' && a.url) imageUrls.add(a.url);
                });
              });
            }
          }
        }

        // From DM messages
        const convos = queryClient.getQueryData(['dm-conversations']) as any[];
        convos?.forEach(conv => {
          const msgs = queryClient.getQueryData(['dm-messages', conv.id]) as any[];
          msgs?.forEach(msg => {
            (msg.attachments || []).forEach((a: any) => {
              if (a.type === 'image' && a.url) imageUrls.add(a.url);
            });
          });
        });

        // Fire-and-forget prefetch
        imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
        });
      } catch {}
    });

    // GROUP 7: Friends (background, no loading step)
    const friendsPromise = (async () => {
      const cached = readCache<any>(`cache:friends:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['friends', user.id], cached);
      } else {
        try {
          const { data } = await supabase
            .from('friendships')
            .select('id, status, created_at, user_id, friend_id')
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
          if (data && data.length > 0) {
            const friendIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
            const { data: profiles } = await supabase
              .rpc('get_friendship_profiles', { friendship_user_ids: friendIds });
            const friends = data.map(f => {
              const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
              const profile = profiles?.find((p: any) => p.id === friendId);
              return { ...f, profile, isIncoming: f.friend_id === user.id };
            }).filter(f => f.profile);
            queryClient.setQueryData(['friends', user.id], friends);
            writeCache(`cache:friends:${user.id}`, friends);
          }
        } catch {}
      }
    })();

    // GROUP 8: Notifications (background)
    const notificationsPromise = (async () => {
      const cached = readCache<any>(`cache:notifications:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['notifications'], cached);
      } else {
        try {
          const { data } = await supabase
            .from('server_notifications')
            .select(`
              *,
              server:servers!server_notifications_server_id_fkey (name, icon_url),
              sender:profiles!server_notifications_sender_id_fkey (display_name, avatar_url)
            `)
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false });
          if (data) {
            queryClient.setQueryData(['notifications'], data);
            writeCache(`cache:notifications:${user.id}`, data);
          }
        } catch {}
      }
    })();

    // GROUP 9: Unread counts (background)
    const unreadCountsPromise = (async () => {
      const cached = readCache<any>(`cache:unread-counts:${user.id}`);
      if (cached) {
        queryClient.setQueryData(['unread-counts', user.id], cached);
      }
      const serverCached = readCache<any>(`cache:server-unread:${user.id}`);
      if (serverCached) {
        queryClient.setQueryData(['server-unread-counts', user.id], serverCached);
      }
    })();

    // Run all groups in parallel, messages phase waits for channels+DMs
    Promise.all([profilePromise, membersPromise, permissionsPromise, channelPermsPromise, messagesPhase, friendsPromise, notificationsPromise, unreadCountsPromise])
      .then(() => {
        writeCache('cache:preloader-done', '1');
      });
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
    { label: 'Messages serveur', key: 'serverMessages', loaded: serverMessagesLoaded },
    { label: 'Messages DM', key: 'dmMessages', loaded: dmMessagesLoaded },
    { label: 'Messages threads', key: 'threadMessages', loaded: threadMessagesLoaded },
  ], [authLoading, serversLoaded, profileLoaded, serverOrderLoaded, channelsLoaded, membersLoaded, permissionsLoaded, channelPermsLoaded, dmsLoaded, serverMessagesLoaded, dmMessagesLoaded, threadMessagesLoaded]);

  const loadedCount = steps.filter(s => s.loaded).length;
  const progress = Math.round((loadedCount / steps.length) * 100);
  const currentStep = steps.find(s => !s.loaded)?.label || 'Finalisation';
  const allLoaded = steps.every(s => s.loaded);
  const ready = allLoaded && minTimePassed;

  return { ready, progress, currentStep, steps };
}
