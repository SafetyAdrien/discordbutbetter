import { useCallback } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

/*
 * Relations avec les autres utilisateurs, enregistrees dans les parametres de l'utilisateur : pseudo d'ami
 * ("Ajouter un pseudo d'ami", visible par toi seul) et comptes ignores.
 */
export function useRelations() {
  const { settings, update } = useUserSettings();
  const { nicknames, ignored } = settings.relations;

  const nicknameOf = useCallback((id: string | null | undefined) => (id ? nicknames.find((n) => n.id === id)?.nick ?? null : null), [nicknames]);
  /** Nom affiche : pseudo d'ami s'il existe, sinon le nom d'affichage. */
  const nameFor = useCallback((id: string | null | undefined, fallback: string) => nicknameOf(id) ?? fallback, [nicknameOf]);
  const setNickname = useCallback(
    (id: string, nick: string | null) => {
      const clean = nick?.trim() ?? '';
      const rest = nicknames.filter((n) => n.id !== id);
      update({ relations: { nicknames: clean ? [...rest, { id, nick: clean }] : rest } });
    },
    [nicknames, update],
  );
  const isIgnored = useCallback((id: string | null | undefined) => !!id && ignored.includes(id), [ignored]);
  const toggleIgnore = useCallback((id: string) => update({ relations: { ignored: ignored.includes(id) ? ignored.filter((x) => x !== id) : [...ignored, id] } }), [ignored, update]);

  return { nicknameOf, nameFor, setNickname, isIgnored, toggleIgnore };
}
