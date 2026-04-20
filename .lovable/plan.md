

## Problèmes identifiés

### 1. Markdown manquants dans la barre
La barre a 9 icônes inline. **Manquent** les éléments de **bloc** que le moteur `markdown.tsx` supporte :
- `# Titre` (header1), `## Titre` (header2), `### Titre` (header3)
- `-# Subtext` (texte discret gris)
- `1. ` Liste numérotée (`orderedListItem`)
- ` ``` ` Bloc de code multi-ligne (`codeBlock`)
- `>>> ` Citation multi-ligne (`multiBlockquote`)

### 2. Décalage de la barre de saisie au clic
Deux causes cumulées :
- **Layout cassé** : le wrapper Markdown utilise `flex-1 min-w-0` → il prend toute la largeur disponible et **pousse** les boutons de droite (Sticker/Emoji/Send) à chaque ouverture/fermeture, créant un saut visuel.
- **Largeur insuffisante** : `max-w-[400px]` ne suffit pas pour 16 icônes → débordement horizontal et chevauchement avec le bloc droit.

## Solution

### A — Refonte du layout de la barre d'actions (corrige le décalage)

Restructurer la `<div>` ligne 634 en **3 zones fixes** plutôt qu'en `justify-between` avec un milieu élastique :

```text
[+] [‹/›  H1 H2 H3 -# B I U S </> ``` 〝 ❯❯❯ • 1. 🔗 ‖ ]    [🏷️ 😊 ➤]
 ↑   ↑                                                          ↑
fixe  zone scrollable horizontalement (flex-1 min-w-0)         fixe (shrink-0)
```

Changements concrets :
1. La `<div>` parent reste `flex items-center` mais on ajoute `gap-1`.
2. **Bloc gauche** : `+` reste tel quel (shrink-0).
3. **Bloc Markdown** : devient `flex items-center min-w-0 flex-1 overflow-hidden` (au lieu de juste `flex-1`). Le wrapper interne des icônes utilise `overflow-x-auto scrollbar-none` quand ouvert pour permettre le défilement horizontal silencieux si l'espace manque, sans pousser les autres blocs.
4. **Bloc droit** : ajouter `shrink-0` pour qu'il ne soit jamais compressé/déplacé.
5. Augmenter `max-w-[400px]` → `max-w-[640px]` pour les 16 icônes.

### B — Ajout des 7 markdown manquants

Mettre à jour `applyMarkdown` pour mieux gérer les blocs multi-lignes (` ``` ... ``` ` et `>>> `). Ajouter une variante `applyBlockWrap(prefix, suffix)` qui :
- insère `prefix\n` avant la sélection et `\nsuffix` après
- place le caret à l'intérieur si pas de sélection

Nouveaux boutons (lucide-react) à ajouter avant Bold :
| Icône | Action | Insertion |
|---|---|---|
| `Heading1` | Titre 1 | `# ` (préfixe ligne) |
| `Heading2` | Titre 2 | `## ` (préfixe ligne) |
| `Heading3` | Titre 3 | `### ` (préfixe ligne) |
| `Type` | Subtext | `-# ` (préfixe ligne) |

Et après List (avant Link) :
| Icône | Action | Insertion |
|---|---|---|
| `ListOrdered` | Liste numérotée | `1. ` (préfixe ligne) |
| `TextQuote` | Citation multi-ligne | `>>> ` (préfixe en début de bloc) |
| `SquareCode` | Bloc de code | ` ``` \nselected\n``` ` (block wrap) |

Ordre final (16 boutons) :
`H1 · H2 · H3 · -# · | · B · I · U · S · </> · ``` · 〝 · ❯❯❯ · • · 1. · 🔗 · ‖`
(avec un séparateur visuel `<div className="w-px h-4 bg-border/40 mx-1" />` entre groupes Titres / Inline / Blocs)

### C — Empêcher le saut vertical au clic

- Ajouter `onMouseDown={e => e.preventDefault()}` sur tous les boutons Markdown : empêche le textarea de perdre le focus pendant le clic, donc pas de re-rendu / re-mesure du textarea.
- Cela élimine le scroll-into-view automatique du navigateur qui décalait la zone.

### D — Détails

- Les boutons Markdown gardent les mêmes classes (`text-muted-foreground hover:text-primary rounded-full p-1.5`).
- Tooltip `title` localisé en français (« Titre 1 », « Liste numérotée », « Bloc de code », etc.).
- Aucun changement sur `markdown.tsx` (le moteur supporte déjà tous ces tokens).
- Aucune nouvelle dépendance.

## Fichier modifié

- `src/components/chat/MessageInput.tsx`
  - Imports lucide : ajouter `Heading1, Heading2, Heading3, Type, ListOrdered, TextQuote, SquareCode`
  - `applyMarkdown` : ajouter un mode `blockWrap` (4ème paramètre booléen) pour ` ``` ` et `>>> `
  - JSX ligne 634–743 : restructurer en 3 zones fixes, ajouter les 7 boutons + 2 séparateurs, ajouter `onMouseDown preventDefault` sur tous les boutons Markdown, agrandir `max-w-[640px]`

