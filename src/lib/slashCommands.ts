import { useSyncExternalStore } from 'react';
import { userKey } from '@/lib/userScope';

/*
 * Commandes slash integrees (video de reference : liste "Integre", puces des
 * options au survol, tri par pertinence puis par frequence d'usage).
 * Les descriptions sont celles relevees sur la video ; les options de /kick,
 * /timeout, /spoiler, /sticker, /tts, /tableflip et /unflip ne s'y voient pas
 * (jamais survolees) : elles suivent la logique de Discord.
 */

export type SlashOptionType = 'string' | 'user' | 'choice';

export interface SlashChoice {
  name: string;
  value: string;
}

export interface SlashOption {
  name: string;
  description: string;
  type: SlashOptionType;
  required: boolean;
  choices?: SlashChoice[];
}

export interface SlashCommand {
  id: string;
  name: string;
  description: string;
  options: SlashOption[];
  /** Section d'origine ("Integre" pour les commandes du client). */
  source: string;
}

export const BUILTIN_SOURCE = 'Intégré';

const DELETE_MESSAGES_CHOICES: SlashChoice[] = [
  { name: 'Ne rien supprimer', value: '0' },
  { name: 'Dernière heure', value: '3600' },
  { name: 'Dernières 6 heures', value: '21600' },
  { name: 'Dernières 12 heures', value: '43200' },
  { name: 'Dernières 24 heures', value: '86400' },
  { name: '3 derniers jours', value: '259200' },
  { name: '7 derniers jours', value: '604800' },
];

const TIMEOUT_CHOICES: SlashChoice[] = [
  { name: '60 secondes', value: '60' },
  { name: '5 minutes', value: '300' },
  { name: '10 minutes', value: '600' },
  { name: '1 heure', value: '3600' },
  { name: '1 jour', value: '86400' },
  { name: '1 semaine', value: '604800' },
];

const cmd = (name: string, description: string, options: SlashOption[] = []): SlashCommand => ({
  id: `builtin:${name}`,
  name,
  description,
  options,
  source: BUILTIN_SOURCE,
});

const opt = (name: string, description: string, type: SlashOptionType, required: boolean, choices?: SlashChoice[]): SlashOption => ({
  name,
  description,
  type,
  required,
  choices,
});

/** Ordre alphabetique, comme la liste "Integre" de la video. */
export const BUILTIN_COMMANDS: SlashCommand[] = [
  cmd('ban', 'Bannir l’utilisateur', [
    opt('user', 'L’utilisateur à bannir', 'user', true),
    opt('delete_messages', 'La quantité de l’historique de ses messages récents à supprimer', 'choice', true, DELETE_MESSAGES_CHOICES),
    opt('reason', 'La raison du bannissement, le cas échéant', 'string', false),
  ]),
  cmd('gif', 'Chercher des GIF animés sur Internet', [opt('query', 'Rechercher un GIF', 'string', true)]),
  cmd('kick', 'Expulser l’utilisateur', [
    opt('user', 'L’utilisateur à expulser', 'user', true),
    opt('reason', 'La raison de l’expulsion, le cas échéant', 'string', false),
  ]),
  cmd('me', 'Affiche le texte en emphase.', [opt('message', 'Ton message', 'string', true)]),
  cmd('msg', 'Envoyer un message à l’utilisateur', [
    opt('user', 'L’utilisateur à qui tu veux envoyer un message', 'user', true),
    opt('message', 'Message à envoyer', 'string', true),
  ]),
  cmd('nick', 'Changer de pseudo sur ce serveur.', [opt('new_nick', 'Nouveau pseudo', 'string', true)]),
  cmd('shrug', 'Ajoute ¯\\_(ツ)_/¯ à ton message.', [opt('message', 'Ton message', 'string', false)]),
  cmd('spoiler', 'Définit ton message comme étant un spoiler.', [opt('message', 'Ton message', 'string', true)]),
  cmd('sticker', 'Recherche dans tes autocollants', [opt('query', 'Recherche un autocollant', 'string', true)]),
  cmd('tableflip', 'Ajoute (╯°□°)╯︵ ┻━┻ à ton message.', [opt('message', 'Ton message', 'string', false)]),
  cmd('thread', 'Démarrer un nouveau fil', [
    opt('name', 'Saisis un nom pour ton fil', 'string', true),
    opt('message', 'Saisis le premier message de ton fil', 'string', true),
  ]),
  cmd('timeout', 'Exclure temporairement l’utilisateur', [
    opt('user', 'L’utilisateur à exclure', 'user', true),
    opt('duration', 'La durée de l’exclusion', 'choice', true, TIMEOUT_CHOICES),
    opt('reason', 'La raison de l’exclusion, le cas échéant', 'string', false),
  ]),
  cmd('tts', 'Utiliser la synthèse vocale pour lire un message à tous les membres présents dans le salon.', [opt('message', 'Ton message', 'string', true)]),
  cmd('unflip', 'Ajoute ┬─┬ ノ( ゜-゜ノ) à ton message.', [opt('message', 'Ton message', 'string', false)]),
];

export const requiredOptions = (c: SlashCommand) => c.options.filter((o) => o.required);
export const optionalOptions = (c: SlashCommand) => c.options.filter((o) => !o.required);

/* ------------------------------------------------------------------ */
/* Frequence d'usage ("Frequemment utilises" + tri des resultats)       */
/* ------------------------------------------------------------------ */

const USAGE_KEY = 'slash-command-usage:v1';
let usage: Record<string, number> = {};
try {
  usage = JSON.parse(localStorage.getItem(userKey(USAGE_KEY)) ?? '{}') ?? {};
} catch {
  usage = {};
}
const listeners = new Set<() => void>();

export function recordSlashUsage(id: string) {
  usage = { ...usage, [id]: (usage[id] ?? 0) + 1 };
  try {
    localStorage.setItem(userKey(USAGE_KEY), JSON.stringify(usage));
  } catch {
    /* stockage indisponible : l'usage reste en memoire */
  }
  listeners.forEach((l) => l());
}

export function useSlashUsage(): Record<string, number> {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => usage,
  );
}

export const FREQUENT_LIMIT = 5;

export function frequentCommands(commands: SlashCommand[], counts: Record<string, number>): SlashCommand[] {
  return commands
    .filter((c) => (counts[c.id] ?? 0) > 0)
    .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.name.localeCompare(b.name))
    .slice(0, FREQUENT_LIMIT);
}

/* ------------------------------------------------------------------ */
/* Recherche : "/g" -> gif, puis noms contenant g, puis options, puis   */
/* descriptions (sous-sequence) ; a egalite, usage puis alphabetique.   */
/* ------------------------------------------------------------------ */

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function isSubsequence(needle: string, hay: string) {
  let i = 0;
  for (const ch of hay) if (ch === needle[i] && ++i === needle.length) return true;
  return needle.length === 0;
}

function rank(c: SlashCommand, q: string): number {
  const name = fold(c.name);
  if (name.startsWith(q)) return 0;
  if (name.includes(q)) return 1;
  if (c.options.some((o) => fold(o.name).includes(q))) return 2;
  if (isSubsequence(q, fold(c.description))) return 3;
  return -1;
}

export function searchCommands(commands: SlashCommand[], rawQuery: string, counts: Record<string, number>): SlashCommand[] {
  const q = fold(rawQuery.trim());
  if (!q) return commands;
  return commands
    .map((c) => ({ c, r: rank(c, q) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || (counts[b.c.id] ?? 0) - (counts[a.c.id] ?? 0) || a.c.name.localeCompare(b.c.name))
    .map((x) => x.c);
}
