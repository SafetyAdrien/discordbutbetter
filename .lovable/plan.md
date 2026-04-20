

## Objectif

Ajouter une **barre d'outils Markdown** dans la barre d'actions du `MessageInput`, sur la même ligne que `+`, `Sticker`, `Emoji`, `Send`. La barre est **rétractable** via un bouton chevron : `ChevronRight` pour ouvrir, `ChevronLeft` pour fermer (gain de place).

## Structure visuelle cible

État **fermé** (par défaut) :
```text
┌──────────────────────────────────────────────────┐
│ Textarea pleine largeur                          │
├──────────────────────────────────────────────────┤
│ ⊕  ›                          🏷️  😊  ➤          │
└──────────────────────────────────────────────────┘
```

État **ouvert** :
```text
┌──────────────────────────────────────────────────┐
│ Textarea pleine largeur                          │
├──────────────────────────────────────────────────┤
│ ⊕  ‹  B  I  U  S  </>  ”  •  🔗  ‖     🏷️ 😊 ➤  │
└──────────────────────────────────────────────────┘
```

## Icônes Markdown (lucide-react)

| Icône | Action | Wrap |
|---|---|---|
| `Bold` | Gras | `**texte**` |
| `Italic` | Italique | `*texte*` |
| `Underline` | Souligné | `__texte__` |
| `Strikethrough` | Barré | `~~texte~~` |
| `Code` | Inline code | `` `texte` `` |
| `Quote` | Citation | `> texte` (préfixe ligne) |
| `List` | Liste à puces | `- texte` (préfixe ligne) |
| `Link` | Lien | `[texte](url)` |
| `EyeOff` | Spoiler | `\|\|texte\|\|` |

Toutes mappées sur la sélection actuelle du textarea (ou insérées au curseur si pas de sélection), avec re-focus + restauration du caret après l'insertion.

## Comportement du toggle

- Nouveau state local `markdownBarOpen` (défaut `false`).
- Bouton chevron placé **juste à droite du `+`** :
  - Fermé → `ChevronRight` (clic = ouvrir, animation `width` 0 → auto sur un wrapper `overflow-hidden`)
  - Ouvert → `ChevronLeft` (clic = fermer)
- Les icônes Markdown apparaissent dans un conteneur `flex` entre le chevron et le bloc droit, avec une transition `max-width` douce (200ms, `cubic-bezier(0.2,0,0,1)` — cohérent avec le wrapper existant).
- Sur mobile (`isMobile`) : la barre Markdown reste accessible mais en mode rétracté par défaut pour préserver l'espace horizontal.

## Implémentation

**1 seul fichier modifié : `src/components/chat/MessageInput.tsx`**

1. **Imports** (ligne 12) : ajouter `ChevronLeft, ChevronRight, Bold, Italic, Underline, Strikethrough, Code, Quote, List, Link as LinkIcon, EyeOff`.
2. **State** : ajouter `const [markdownBarOpen, setMarkdownBarOpen] = useState(false);` près des autres states.
3. **Helper** : ajouter une fonction `applyMarkdown(prefix: string, suffix: string, isLinePrefix?: boolean)` qui :
   - Lit `textareaRef.current.selectionStart` / `selectionEnd`
   - Pour `isLinePrefix` (Quote, List) : insère le préfixe au début de chaque ligne sélectionnée
   - Pour les wraps : enveloppe la sélection (ou insère `prefix+suffix` au curseur)
   - Met à jour `value` via `onChange`
   - Restaure le focus + place le caret de manière logique
4. **JSX (ligne 591–632)** : entre le `<Popover>` du `+` et la `<div>` droite, insérer :
   ```tsx
   <button onClick={() => setMarkdownBarOpen(o => !o)} ...>
     {markdownBarOpen ? <ChevronLeft/> : <ChevronRight/>}
   </button>
   <div className={`flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity] duration-200 ${markdownBarOpen ? 'max-w-[400px] opacity-100' : 'max-w-0 opacity-0'}`}>
     {/* 9 boutons icônes Markdown */}
   </div>
   ```
5. **Layout** : restructurer la `<div>` parent en `flex items-center` avec un sous-groupe gauche `flex-1 min-w-0` (contient `+` + chevron + barre Markdown) et le sous-groupe droit inchangé (Sticker/Emoji/Send).

## Détails préservés

- Tous les comportements existants : auto-resize, mention autocomplete, overlay markdown, slowmode, follow bar, permission denied, mode `compact`.
- Aucune nouvelle dépendance.
- Les boutons Markdown utilisent les **mêmes classes** que les boutons existants (`text-muted-foreground hover:text-primary rounded-full p-1.5`) avec icônes `w-4 h-4` (cohérent avec le mode compact actuel).
- Tooltip natif via `title="Gras (Ctrl+B)"`, etc.
- **Bonus optionnel** : raccourcis clavier `Ctrl/Cmd+B`, `+I`, `+U` déjà gérés ? Sinon on les ajoute dans `handleKeyDown` pour appeler `applyMarkdown`.

## Garantie « ne casse rien »

- Aucune modification de signature de `MessageInput` (zéro nouvelle prop).
- Aucun changement sur les hooks, mutations, ou structure du textarea.
- Sur les viewports étroits, la barre étant rétractable, aucun débordement horizontal.
- Persistance optionnelle de `markdownBarOpen` dans `localStorage` ? **Non** — état local par instance, redémarre fermé pour rester discret par défaut.

## Fichier modifié

- `src/components/chat/MessageInput.tsx` (imports + 1 state + 1 helper + refonte de la barre d'actions ligne 591–673)

