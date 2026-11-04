/*
 * Traduction de toute l'interface sans toucher aux composants : les textes
 * francais de l'app servent de cles (src/i18n/source.json, extrait par
 * scripts/i18n-extract.mjs) et un MutationObserver remplace, dans le DOM,
 * les noeuds texte et les attributs affiches (placeholder, title,
 * aria-label, alt) par leur traduction.
 *
 * - Changement instantane : on retraduit (ou restaure) tout le document.
 * - React reste maitre du DOM : on ne modifie que `nodeValue` / la valeur
 *   des attributs, jamais la structure ; quand React reecrit un texte,
 *   l'observateur le retraduit.
 * - `translate="no"` (contenu des messages, noms...) n'est jamais traduit.
 * - Motifs : "Etape {0} sur {1}" traduit aussi "Etape 5 sur 6".
 */

type Dict = Record<string, string>;

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT', 'svg']);

let dict: Dict | null = null;
let patterns: { re: RegExp; out: string }[] = [];
const cache = new Map<string, string | null>();

// Texte source de chaque noeud traduit, pour restaurer ou retraduire.
const textSource = new WeakMap<Text, { src: string; out: string }>();
const attrSource = new WeakMap<Element, Map<string, { src: string; out: string }>>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ENTITIES: Record<string, string> = { '&gt;': '>', '&lt;': '<', '&amp;': '&', '&nbsp;': '\u00a0', '&quot;': '"', '&#39;': "'" };
const decode = (s: string) => s.replace(/&(gt|lt|amp|nbsp|quot|#39);/g, (m) => ENTITIES[m] ?? m);

/** Cles et valeurs ecrites en JSX (&gt;, &nbsp;...) telles qu'affichees. */
function normalize(d: Dict): Dict {
  const out: Dict = {};
  for (const [k, v] of Object.entries(d)) {
    out[decode(k).replace(/\s+/g, ' ').trim()] = decode(v);
  }
  return out;
}

function compile(d: Dict) {
  patterns = Object.entries(d)
    .filter(([k]) => /\{\d\}/.test(k))
    .map(([k, out]) => ({
      re: new RegExp('^' + k.split(/\{\d\}/).map(escapeRe).join('(.*?)') + '$', 's'),
      fixed: k.replace(/\{\d\}/g, '').length,
      out,
      order: [...k.matchAll(/\{(\d)\}/g)].map((m) => Number(m[1])),
    }))
    // Le motif le plus specifique (le plus de texte fixe) passe en premier.
    .sort((a, b) => b.fixed - a.fixed)
    .map(({ re, out, order }) => ({
      re,
      // Remet les captures dans l'ordre de la cle source.
      out: out.replace(/\{(\d)\}/g, (_, i) => `{${order.indexOf(Number(i))}}`),
    }));
}

/** Traduction d'un texte (sans espaces de bord), ou null. */
export function translateText(src: string): string | null {
  if (!dict) return null;
  const hit = cache.get(src);
  if (hit !== undefined) return hit;
  let out: string | null = dict[src] ?? null;
  if (out == null && /\p{L}/u.test(src) && src.length < 400) {
    for (const p of patterns) {
      const m = p.re.exec(src);
      if (!m) continue;
      out = p.out.replace(/\{(\d)\}/g, (_, i) => {
        const v = m[Number(i) + 1] ?? '';
        // Capture plus courte que la source : la recursion se termine.
        return (v.length < src.length ? translateText(v) : null) ?? v;
      });
      break;
    }
  }
  // Libelles composes ("Categories de salons — Original", "A · B") :
  // traduits morceau par morceau.
  if (out == null && /\s[—·:|]\s|\s:\s|\.\s/.test(src)) {
    const parts = src.split(/(\s[—·|]\s|\s?:\s|\.\s)/);
    let changed = false;
    const joined = parts.map((part) => {
      const t = part.trim() && !/^\s?[—·|:.]\s?$/.test(part) ? dict?.[part.trim()] ?? dict?.[part.trim().replace(/\.$/, '')] : undefined;
      if (t) changed = true;
      return t ?? part;
    });
    if (changed) out = joined.join('');
  }
  if (cache.size > 20000) cache.clear();
  cache.set(src, out);
  return out;
}

function translateWithSpaces(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed) return null;
  const out = translateText(trimmed.replace(/\s+/g, ' '));
  if (out == null) return null;
  const lead = src.slice(0, src.indexOf(trimmed[0]));
  const trail = src.slice(src.lastIndexOf(trimmed[trimmed.length - 1]) + 1);
  return lead + out + trail;
}

/** Exclusion pour un attribut : l'element lui-meme peut etre un textarea. */
function isAttrExcluded(el: Element): boolean {
  return el.getAttribute('translate') === 'no' || isExcluded(el.parentElement);
}

function isExcluded(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.getAttribute('translate') === 'no' || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function handleText(node: Text) {
  const prev = textSource.get(node);
  const current = node.nodeValue ?? '';
  // React a remplace le texte : la nouvelle valeur devient la source.
  const src = prev && current === prev.out ? prev.src : current;
  if (!dict) {
    if (prev && current === prev.out) node.nodeValue = prev.src;
    textSource.delete(node);
    return;
  }
  if (isExcluded(node.parentElement)) return;
  const out = translateWithSpaces(src);
  if (out == null || out === src) {
    if (prev && current === prev.out) node.nodeValue = src;
    textSource.delete(node);
    return;
  }
  textSource.set(node, { src, out });
  if (current !== out) node.nodeValue = out;
}

function handleAttr(el: Element, name: string) {
  const value = el.getAttribute(name);
  let map = attrSource.get(el);
  const prev = map?.get(name);
  if (value == null) {
    map?.delete(name);
    return;
  }
  const src = prev && value === prev.out ? prev.src : value;
  if (!dict) {
    if (prev && value === prev.out) el.setAttribute(name, prev.src);
    map?.delete(name);
    return;
  }
  if (isAttrExcluded(el)) return;
  const out = translateWithSpaces(src);
  if (out == null || out === src) {
    if (prev && value === prev.out) el.setAttribute(name, src);
    map?.delete(name);
    return;
  }
  if (!map) attrSource.set(el, (map = new Map()));
  map.set(name, { src, out });
  if (value !== out) el.setAttribute(name, out);
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    handleText(root as Text);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
  const el = root as Element;
  if (el.nodeType === Node.ELEMENT_NODE && isExcluded(el)) {
    if (SKIP_TAGS.has(el.tagName) && !isAttrExcluded(el)) for (const a of ATTRS) if (el.hasAttribute(a)) handleAttr(el, a);
    return;
  }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
      const e = n as Element;
      if (e.getAttribute('translate') === 'no') return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(e.tagName)) {
        // Le contenu d'un textarea est la saisie ; ses attributs s'affichent.
        for (const a of ATTRS) if (e.hasAttribute(a)) handleAttr(e, a);
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  if (el.nodeType === Node.ELEMENT_NODE) for (const a of ATTRS) if (el.hasAttribute(a)) handleAttr(el, a);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) handleText(n as Text);
    else for (const a of ATTRS) if ((n as Element).hasAttribute(a)) handleAttr(n as Element, a);
  }
}

let observer: MutationObserver | null = null;
let applying = false;

function onMutations(records: MutationRecord[]) {
  if (applying) return;
  applying = true;
  try {
    for (const r of records) {
      if (r.type === 'characterData') handleText(r.target as Text);
      else if (r.type === 'attributes') handleAttr(r.target as Element, r.attributeName!);
      else r.addedNodes.forEach(walk);
    }
  } finally {
    // Nos propres ecritures generent des enregistrements : on les ignore.
    observer?.takeRecords();
    applying = false;
  }
}

/** Active un dictionnaire (null = francais d'origine) et retraduit la page. */
export function applyDictionary(next: Dict | null) {
  dict = next ? normalize(next) : null;
  cache.clear();
  if (dict) compile(dict);
  else patterns = [];
  if (typeof document === 'undefined') return;
  if (!observer && next) {
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
  }
  applying = true;
  try {
    walk(document.body);
    const title = document.title;
    const t = next ? translateText(title) : null;
    if (t) document.title = t;
  } finally {
    observer?.takeRecords();
    applying = false;
  }
}
