/**
 * Lazy highlight.js loader.
 *
 * `highlight.js` plus ses ~20 grammaires pèsait ~276 KB et était importé
 * statiquement par le chemin de rendu des messages : chaque visiteur le
 * téléchargeait même sans jamais voir un bloc de code.
 *
 * On ne charge donc le core + les grammaires qu'au premier besoin réel, et on
 * met en cache le module pour les appels suivants.
 */
import type { HLJSApi, LanguageFn } from 'highlight.js';

type Core = typeof import('highlight.js/lib/core');
type LangModule = { default: LanguageFn };

// Une seule instance partagée : `registerLanguage` est global.
let hljsPromise: Promise<HLJSApi> | null = null;

/** Alias langage -> fichier de grammaire. Évite d'importer 20 modules statiquement. */
const GRAMMARS: Record<string, () => Promise<LangModule>> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  css: () => import('highlight.js/lib/languages/css'),
  json: () => import('highlight.js/lib/languages/json'),
  bash: () => import('highlight.js/lib/languages/bash'),
  sql: () => import('highlight.js/lib/languages/sql'),
  xml: () => import('highlight.js/lib/languages/xml'),
  go: () => import('highlight.js/lib/languages/go'),
  rust: () => import('highlight.js/lib/languages/rust'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  c: () => import('highlight.js/lib/languages/c'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
  java: () => import('highlight.js/lib/languages/java'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  kotlin: () => import('highlight.js/lib/languages/kotlin'),
  swift: () => import('highlight.js/lib/languages/swift'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
};

/** Alias -> nom canonique utilisé par GRAMMARS. */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  html: 'xml',
  golang: 'go',
  rs: 'rust',
  'c++': 'cpp',
  cxx: 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  rb: 'ruby',
  kt: 'kotlin',
  yml: 'yaml',
};

function canonicalName(language: string): string | null {
  const name = language.toLowerCase();
  const resolved = ALIASES[name] ?? name;
  return GRAMMARS[resolved] ? resolved : null;
}

/**
 * Charge highlight.js et enregistre les grammaires correspondant à `language`.
 * Résout vers `null` si le chargement échoue ou si le langage est inconnu :
 * le code reste alors affiché sans coloration, ce qui est acceptable.
 */
export function loadHljs(language?: string): Promise<HLJSApi | null> {
  const canonical = language ? canonicalName(language) : null;

  // On ne charge que le core si le langage demandé n'est pas supporté :
  // `highlightElement` fait alors de l'auto-détection.
  const grammars = canonical ? [GRAMMARS[canonical]()] : [];

  const load = async (): Promise<HLJSApi | null> => {
    try {
      const [core, ...langs] = await Promise.all([
        import('highlight.js/lib/core'),
        ...grammars,
      ]);
      const hljs = (core as Core).default;

      for (const lang of langs) {
        const name = canonical!;
        if (!hljs.getLanguage(name)) hljs.registerLanguage(name, lang.default);
      }
      return hljs as unknown as HLJSApi;
    } catch {
      return null;
    }
  };

  if (canonical) {
    if (!hljsPromise) hljsPromise = load() as Promise<HLJSApi>;
    // Le module est mis en cache globalement ; si le premier chargement a
    // échoué, `load()` est retenté pour les grammaires manquantes.
    return hljsPromise.then((hljs) =>
      hljs.getLanguage(canonical) ? hljs : load(),
    );
  }

  return load();
}