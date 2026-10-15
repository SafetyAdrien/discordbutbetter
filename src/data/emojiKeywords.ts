interface CldrAnnotationEntry {
  default: string[];
  tts?: string[];
}

interface CldrAnnotationsFile {
  annotations: {
    annotations: Record<string, CldrAnnotationEntry>;
  };
}

// CLDR indexes emoji without the U+FE0F variation selector; our emoji data
// (src/data/emojis.ts) includes it for some characters, so normalize both
// sides the same way before building the lookup table.
function stripVariationSelector(char: string): string {
  return char.replace(/️/g, '');
}

function buildKeywordIndex(file: CldrAnnotationsFile): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [char, entry] of Object.entries(file.annotations.annotations)) {
    map.set(stripVariationSelector(char), entry.default);
  }
  return map;
}

// The CLDR annotation files are ~350 KB of JSON each. Importing them statically
// inlined them into the entry bundle and made up ~25% of it, even though they
// are only needed once the user actually types in the emoji search box.
// They are therefore loaded on demand, and `getEmojiKeywords` returns no
// keywords (category-name matching still works) until they have arrived.
type KeywordIndex = Map<string, string[]>;

let frIndex: KeywordIndex | null = null;
let enIndex: KeywordIndex | null = null;
let loadPromise: Promise<void> | null = null;

/** Kick off the CLDR download without blocking the caller. Safe to call repeatedly. */
export function preloadEmojiKeywords(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = Promise.all([
    import('cldr-annotations-modern/annotations/fr/annotations.json'),
    import('cldr-annotations-modern/annotations/en/annotations.json'),
  ]).then(([fr, en]) => {
    frIndex = buildKeywordIndex(fr.default as unknown as CldrAnnotationsFile);
    enIndex = buildKeywordIndex(en.default as unknown as CldrAnnotationsFile);
  }).catch(() => {
    // Search degrades to category-name matching; never break the picker.
    loadPromise = null;
  });
  return loadPromise;
}

/** French + English keywords for a given emoji character, lowercased. */
export function getEmojiKeywords(char: string): string[] {
  if (!frIndex || !enIndex) return [];
  const key = stripVariationSelector(char);
  const fr = frIndex.get(key) ?? [];
  const en = enIndex.get(key) ?? [];
  return [...fr, ...en].map((w) => w.toLowerCase());
}
