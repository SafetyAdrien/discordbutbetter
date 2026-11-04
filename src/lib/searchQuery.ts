/**
 * Requete de recherche "a la Discord" : le texte de la barre est la seule
 * source de verite. Les filtres sont des jetons `prefixe: valeur` (de:,
 * dans:, contient:, mentions:, avant:, pendant:, apres:, auteur:, epingle:)
 * et le reste est du texte libre. La fenetre "Filtres" relit et reecrit ce
 * meme texte.
 *
 * Les valeurs contenant des espaces sont entre guillemets : dans: "salon vocal".
 */

export type SearchHas = 'image' | 'video' | 'link' | 'file' | 'embed' | 'sound' | 'poll' | 'sticker' | 'forward';
export type SearchAuthor = 'user' | 'bot' | 'webhook';
export type SearchDateMode = 'before' | 'after' | 'during';

export interface ParsedSearch {
  text: string;
  from: string[];      // noms d'utilisateur
  in: string[];        // noms de salon
  mentions: string[];  // noms d'utilisateur
  has: SearchHas[];
  authors: SearchAuthor[];
  dates: { mode: SearchDateMode; date: string }[]; // AAAA-MM-JJ
  pinned: boolean | null;
}

export type SearchPrefix = 'de' | 'dans' | 'contient' | 'mentions' | 'avant' | 'pendant' | 'après' | 'auteur' | 'épinglé';

/** Valeurs francaises de "contient:", dans l'ordre du sous-menu Discord. */
export const HAS_OPTIONS: { value: SearchHas; label: string }[] = [
  { value: 'image', label: 'image' },
  { value: 'video', label: 'vidéo' },
  { value: 'link', label: 'lien' },
  { value: 'file', label: 'fichier' },
  { value: 'embed', label: 'intégration' },
  { value: 'sound', label: 'son' },
  { value: 'poll', label: 'sondage' },
  { value: 'sticker', label: 'autocollant' },
  { value: 'forward', label: 'transférer' },
];

export const AUTHOR_OPTIONS: { value: SearchAuthor; label: string }[] = [
  { value: 'user', label: 'utilisateur' },
  { value: 'bot', label: 'bot' },
  { value: 'webhook', label: 'webhook' },
];

const DATE_PREFIX: Record<SearchDateMode, SearchPrefix> = { before: 'avant', after: 'après', during: 'pendant' };

const PREFIX_ALIASES: Record<string, SearchPrefix> = {
  de: 'de', from: 'de',
  dans: 'dans', in: 'dans',
  contient: 'contient', has: 'contient',
  mentions: 'mentions',
  avant: 'avant', before: 'avant',
  pendant: 'pendant', during: 'pendant',
  'après': 'après', apres: 'après', after: 'après',
  auteur: 'auteur', author: 'auteur',
  'épinglé': 'épinglé', epingle: 'épinglé', pinned: 'épinglé',
};

const TOKEN_RE = /(?:^|\s)([a-zéè]+):\s?("([^"]*)"|[^\s"]+)/gi;

export function emptyParsedSearch(): ParsedSearch {
  return { text: '', from: [], in: [], mentions: [], has: [], authors: [], dates: [], pinned: null };
}

const quote = (v: string) => (/\s/.test(v) ? `"${v}"` : v);

export function parseSearch(input: string): ParsedSearch {
  const out = emptyParsedSearch();
  let rest = input;
  for (const m of input.matchAll(TOKEN_RE)) {
    const prefix = PREFIX_ALIASES[m[1].toLowerCase()];
    if (!prefix) continue;
    const value = (m[3] ?? m[2]).trim();
    if (!value) continue;
    rest = rest.replace(m[0], ' ');
    const v = value.toLowerCase();
    switch (prefix) {
      case 'de': out.from.push(value); break;
      case 'dans': out.in.push(value.replace(/^#/, '')); break;
      case 'mentions': out.mentions.push(value.replace(/^@/, '')); break;
      case 'contient': {
        const h = HAS_OPTIONS.find((o) => o.label === v || o.value === v);
        if (h && !out.has.includes(h.value)) out.has.push(h.value);
        break;
      }
      case 'auteur': {
        const a = AUTHOR_OPTIONS.find((o) => o.label === v || o.value === v);
        if (a && !out.authors.includes(a.value)) out.authors.push(a.value);
        break;
      }
      case 'épinglé': out.pinned = v === 'true' || v === 'vrai' || v === 'oui'; break;
      case 'avant': out.dates.push({ mode: 'before', date: value }); break;
      case 'après': out.dates.push({ mode: 'after', date: value }); break;
      case 'pendant': out.dates.push({ mode: 'during', date: value }); break;
    }
  }
  out.text = rest.replace(/\s+/g, ' ').trim();
  return out;
}

export function serializeSearch(p: ParsedSearch): string {
  const parts: string[] = [];
  p.from.forEach((v) => parts.push(`de: ${quote(v)}`));
  p.in.forEach((v) => parts.push(`dans: ${quote(v)}`));
  p.has.forEach((v) => parts.push(`contient: ${HAS_OPTIONS.find((o) => o.value === v)?.label ?? v}`));
  p.mentions.forEach((v) => parts.push(`mentions: ${quote(v)}`));
  p.dates.forEach((d) => parts.push(`${DATE_PREFIX[d.mode]}: ${d.date}`));
  p.authors.forEach((v) => parts.push(`auteur: ${AUTHOR_OPTIONS.find((o) => o.value === v)?.label ?? v}`));
  if (p.pinned !== null) parts.push(`épinglé: ${p.pinned ? 'true' : 'false'}`);
  if (p.text) parts.push(p.text);
  return parts.join(' ');
}

/** Nombre de filtres actifs (pour "Filtres (N)" et "Effacer les filtres (N)"). */
export function countFilters(p: ParsedSearch): number {
  return p.from.length + p.in.length + p.mentions.length + p.has.length + p.authors.length + p.dates.length + (p.pinned !== null ? 1 : 0);
}

/**
 * Jeton en cours de saisie a la fin du texte ("dans: gé") : pilote le
 * sous-menu de suggestions. Renvoie null si le curseur n'est pas dans un jeton.
 */
export function activeToken(input: string): { prefix: SearchPrefix; partial: string; start: number } | null {
  const m = input.match(/(?:^|\s)([a-zéè]+):\s?("?[^\s"]*)$/i);
  if (!m) return null;
  const prefix = PREFIX_ALIASES[m[1].toLowerCase()];
  if (!prefix) return null;
  const start = input.length - m[0].length + (m[0].startsWith(' ') ? 1 : 0);
  return { prefix, partial: m[2].replace(/^"/, ''), start };
}

/** Remplace le jeton en cours par `prefixe: valeur ` (selection dans le sous-menu). */
export function completeToken(input: string, prefix: SearchPrefix, value: string): string {
  const t = activeToken(input);
  const head = t ? input.slice(0, t.start) : input.endsWith(' ') || !input ? input : `${input} `;
  return `${head}${prefix}: ${quote(value)} `;
}
