import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useCreateThreadFlow } from '@/hooks/useCreateThreadFlow';
import { addEphemeralMessage } from '@/lib/ephemeralMessages';
import { BUILTIN_COMMANDS, recordSlashUsage, type SlashCommand } from '@/lib/slashCommands';
import type { SlashMember, SlashValues } from './SlashCommandComposer';

/*
 * Execution des commandes slash integrees. Les reponses ("Oups ! ...", "X a ete
 * banni") sont des messages ephemeres de Clyde, visibles de toi seul.
 */

export interface SlashHandlers {
  /** Envoie un message texte dans le salon courant. */
  sendText: (content: string) => void;
  /** Envoie un GIF ou un autocollant dans le salon courant. */
  sendExternal: (attachment: { url: string; name: string; type: 'sticker' | 'gif' }) => void;
}

const FACES = {
  shrug: '¯\\_(ツ)_/¯',
  tableflip: '(╯°□°)╯︵ ┻━┻',
  unflip: '┬─┬ ノ( ゜-゜ノ)',
} as const;

const OOPS_DM = 'Oups ! Une erreur s’est produite lors de l’envoi du message à cet utilisateur.';
const OOPS = 'Oups ! Une erreur s’est produite lors de l’exécution de la commande.';

/** Les commandes que tu ne peux pas utiliser ne sont pas proposees (comme Discord). */
export function useAvailableSlashCommands(serverId: string | null): SlashCommand[] {
  const { hasPermission } = usePermissions(serverId);
  return useMemo(() => {
    // En MP : seulement les commandes qui n'ont pas besoin d'un serveur.
    const DM_OK = ['gif', 'me', 'shrug', 'spoiler', 'sticker', 'tableflip', 'tts', 'unflip'];
    const allowed = (c: SlashCommand) => {
      if (!serverId) return DM_OK.includes(c.name);
      switch (c.name) {
        case 'ban': return hasPermission('ban_members');
        case 'kick':
        case 'timeout': return hasPermission('kick_members');
        case 'nick': return hasPermission('change_nickname');
        case 'tts': return hasPermission('send_tts_messages');
        case 'thread': return hasPermission('create_public_threads');
        default: return true;
      }
    };
    return BUILTIN_COMMANDS.filter(allowed);
  }, [hasPermission, serverId]);
}

export function useSlashExecutor({
  serverId,
  channelId,
  members,
  handlers,
  stickers,
}: {
  serverId: string | null;
  channelId: string | null;
  members: SlashMember[];
  handlers: SlashHandlers;
  stickers: { id: string; name: string; url: string }[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createThreadFlow = useCreateThreadFlow();

  return useCallback(
    async (cmd: SlashCommand, values: SlashValues) => {
      recordSlashUsage(cmd.id);
      const say = (text: string) => channelId && addEphemeralMessage(channelId, text);
      const text = (name: string) => values[name]?.text ?? '';
      const target = () => members.find((m) => m.id === values.user?.userId);

      switch (cmd.name) {
        case 'me':
          handlers.sendText(`_${text('message')}_`);
          return;
        case 'shrug':
        case 'tableflip':
        case 'unflip': {
          const msg = text('message');
          handlers.sendText(msg ? `${msg} ${FACES[cmd.name]}` : FACES[cmd.name]);
          return;
        }
        case 'spoiler':
          handlers.sendText(`||${text('message')}||`);
          return;
        case 'tts': {
          handlers.sendText(text('message'));
          try {
            const u = new SpeechSynthesisUtterance(text('message'));
            u.lang = 'fr-FR';
            window.speechSynthesis?.speak(u);
          } catch {
            /* synthese vocale indisponible : le message part quand meme */
          }
          return;
        }
        case 'gif': {
          try {
            const { data, error } = await supabase.functions.invoke('giphy-search', { body: { query: text('query'), limit: 1 } });
            const first = data?.results?.[0];
            if (error || !first) throw error ?? new Error('no gif');
            handlers.sendExternal({ url: first.url, name: first.title || 'gif', type: 'gif' });
          } catch {
            say('Oups ! Aucun GIF n’a pu être trouvé pour cette recherche.');
          }
          return;
        }
        case 'sticker': {
          const q = text('query').toLowerCase();
          const found = stickers.find((s) => s.name.toLowerCase().includes(q));
          if (found) handlers.sendExternal({ url: found.url, name: found.name, type: 'sticker' });
          else say('Oups ! Aucun autocollant ne correspond à cette recherche.');
          return;
        }
        case 'msg': {
          const who = values.user?.userId;
          if (!who || who === user?.id) return say(OOPS_DM);
          try {
            const { data: conversationId, error: dmError } = await supabase.rpc('create_dm_conversation', { p_other_user_id: who });
            if (dmError || !conversationId) throw dmError ?? new Error('no conversation');
            const { error: sendError } = await supabase
              .from('dm_messages')
              .insert({ conversation_id: conversationId as string, content: text('message'), author_id: user!.id });
            if (sendError) throw sendError;
            void queryClient.invalidateQueries({ queryKey: ['dm-conversations'] });
            void queryClient.invalidateQueries({ queryKey: ['dm-messages', conversationId] });
          } catch {
            say(OOPS_DM);
          }
          return;
        }
        case 'nick': {
          if (!serverId) return;
          const nickname = text('new_nick').slice(0, 32);
          try {
            const { data: existing } = await supabase.from('server_profiles').select('id').eq('user_id', user!.id).eq('server_id', serverId).maybeSingle();
            const { error } = existing
              ? await supabase.from('server_profiles').update({ display_name: nickname || null }).eq('id', existing.id)
              : await supabase.from('server_profiles').insert({ user_id: user!.id, server_id: serverId, display_name: nickname || null });
            if (error) throw error;
            void queryClient.invalidateQueries({ queryKey: ['server-profile', user!.id, serverId] });
            void queryClient.invalidateQueries({ queryKey: ['members', serverId] });
            say(`Ton pseudo est maintenant **${nickname}** sur ce serveur.`);
          } catch {
            say(OOPS);
          }
          return;
        }
        case 'ban':
        case 'kick': {
          const who = target();
          if (!serverId || !who) return say(OOPS);
          if (who.id === user?.id) return say(`Oups ! Tu ne peux pas ${cmd.name === 'ban' ? 'te bannir' : 't’expulser'} toi-même.`);
          try {
            const { error } =
              cmd.name === 'ban'
                ? await supabase.rpc('ban_member', { _server_id: serverId, _user_id: who.id, _reason: text('reason') || null })
                : await supabase.rpc('kick_member', { _server_id: serverId, _user_id: who.id });
            if (error) throw error;
            void queryClient.invalidateQueries({ queryKey: ['members', serverId] });
            void queryClient.invalidateQueries({ queryKey: ['banned-members', serverId] });
            say(`${who.displayName} a été ${cmd.name === 'ban' ? 'banni(e)' : 'expulsé(e)'} du serveur.`);
          } catch {
            say(OOPS);
          }
          return;
        }
        case 'timeout':
          say('L’exclusion temporaire n’est pas encore disponible — Bientôt disponible.');
          return;
        case 'thread': {
          if (!channelId) return;
          try {
            await createThreadFlow({ channelId, name: text('name').slice(0, 100), text: text('message') });
          } catch {
            say(OOPS);
          }
          return;
        }
      }
    },
    [serverId, channelId, members, handlers, stickers, user, queryClient, createThreadFlow],
  );
}
