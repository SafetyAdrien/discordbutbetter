## Objectif

Aligner le rendu markdown sur Discord (image de référence), des deux côtés et sur les deux plateformes :

1. **Conteneur de rédaction (input overlay)** — markers gris **+** contenu réellement stylé (gras, italique, souligné, barré, spoiler pilule, code monospace).
2. **Messages envoyés (rendu)** — typographie & espacements polis, spoiler opaque cliquable, listes à puces hiérarchisées, code inline & bloc, liens primaires.

Aucun changement de logique : pas de toolbar, pas de touche à l'input lui-même, pas de modification de la syntaxe ou du parser de fond.

---

## 1. `src/components/chat/InputMarkdownOverlay.tsx` — WYSIWYG

Suppression de la contrainte "pas de font-weight / font-family". Discord accepte un léger drift de caret pour gagner le vrai rendu : on fait pareil.

- **Gras `**…**`** : `fontWeight: 700` réel (au lieu du `textShadow` simulé).
- **Italique `*…*` / `_…_`** : conservé `fontStyle: 'italic'`.
- **Souligné `__…__`** : `textDecoration: underline` avec offset 2px.
- **Barré `~~…~~`** : `textDecoration: line-through`.
- **Combos** : `***…***`, `___…___`, `__**…**__`, `**__…__**` → cumul des styles réels.
- **Code inline `` `…` ``** : pilule `surface-elevated` + bordure `border/60` + **vraie famille monospace** (`Consolas, "gg mono", ui-monospace, monospace`) + `fontSize: 0.85em`.
- **Spoiler `||…||`** : pilule opaque `foreground/18` (texte reste lisible dans l'input — c'est ce qu'on voit dans l'image).
- **Lien `[label](url)`** : label `text-primary underline`, url en `muted-foreground/55`.
- **Markers** : tous en `muted-foreground/45` (gris discret, comme l'image bas).
- **Blocs de code multi-lignes (overlay)** : les lignes `codeBlockLine` reçoivent la famille monospace + une teinte de fond légère sur toute la ligne (`surface-elevated/40`) pour reproduire la zone grisée de l'image.
- **Blockquote `> `** : marker `> ` en `muted-foreground/45`, contenu en `text-foreground/85` avec un fin trait gauche simulé via `box-shadow inset 2px 0 0 hsl(var(--border))` sur la ligne (pas de padding pour ne pas casser l'alignement).
- **Listes `- ` / `1. ` / `- [ ]`** : marker conservé en `muted-foreground/60` (pas de transformation en glyphe — sinon drift).
- Conserver la projection 1:1 du caret pour les contenus non transformés ; le drift n'apparaît qu'au sein des spans gras/italique/code (acceptable, identique à Discord).

## 2. `src/lib/markdown.tsx` — rendu des messages envoyés

Le tokenizer est déjà bon ; on ne touche qu'au **rendu** des tokens pour matcher l'image haute :

- **`<strong>`/`<em>`/`<u>`/`<del>`** : tels quels (déjà parfaits), juste vérifier `font-weight: 700` global non écrasé.
- **`code` inline** : conserver `bg-surface-elevated` + bordure + `font-mono` + `text-[0.85em]` ; ajouter `whitespace-pre` côté zone code pour préserver les espaces.
- **`spoiler`** : repasser sur pilule opaque `bg-foreground` (texte invisible) avant clic → après clic (`.revealed`), `bg-foreground/15` et texte révélé. CSS dans `index.css` à ajuster si nécessaire.
- **`link` / `autoLink`** : `text-primary hover:underline underline-offset-2`.
- **Liste à puces (`listItem`)** : niveau 0 = `list-disc`, niveau ≥ 1 (indent ≥ 2) = `list-[circle]`, marker `text-muted-foreground`, espacement vertical `gap-0.5`.
- **Liste ordonnée** : `list-decimal`, marker `text-muted-foreground`.
- **Task item** : checkbox SVG + `line-through` quand coché.
- **`blockquote` / `multiBlockquote`** : bordure gauche `border-l-4 border-border`, padding-left `pl-3`, texte `text-foreground/90`.
- **Séparateur (`hr`)** : `border-t border-border my-2`.
- **Headers `# / ## / ###`** : conserver tailles harmonisées actuelles (déjà OK).

## 3. `src/index.css` — petits ajustements

- Spoiler : `.spoiler { background: hsl(var(--foreground)); color: transparent; border-radius: 4px; cursor: pointer; padding: 0 4px; }` et `.spoiler.revealed { background: hsl(var(--foreground) / 0.15); color: inherit; }`.
- `chat-markdown` : autoriser `code`, `pre`, `blockquote`, `ul`, `ol` à conserver leurs marges Tailwind (déjà partiellement fait, vérifier).

## 4. Mobile

Aucune divergence : l'overlay et le renderer sont partagés Desktop/Mobile. La séparation `SwipeToReplyRow` (faite précédemment) n'est pas touchée. Seul l'affichage change, donc Mobile bénéficie automatiquement du patch.

## Détails techniques

```text
overlay caret drift = acceptable
└── ne survient qu'à l'intérieur des spans transformés (gras/italic/code)
└── le textarea reste source de vérité — sélection/copier-coller intacts
└── identique au comportement Discord web
```

Fichiers modifiés :
- `src/components/chat/InputMarkdownOverlay.tsx` (refonte du `renderInlineMarkdownOnly` + style de bloc code/blockquote)
- `src/lib/markdown.tsx` (ajustements rendu liste/spoiler/blockquote)
- `src/index.css` (classe `.spoiler` + assouplissement `chat-markdown` si requis)

Aucun changement : parser, syntaxe markdown supportée, toolbar (inexistante), `SwipeToReplyRow`, hooks, base de données.
