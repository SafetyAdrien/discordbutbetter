

# Rendu Markdown inline directement dans le textarea

## Objectif
Remplacer l'aperçu Markdown séparé (la box "Aperçu Markdown" sous le textarea) par un rendu visuel directement dans l'overlay superposé au textarea. L'utilisateur verra le formatage en temps réel pendant qu'il tape.

## Contrainte technique
L'overlay doit garder exactement les mêmes métriques de police (taille, famille, poids) que le textarea pour que le curseur reste aligné. On ne peut donc pas changer `font-weight` ou `font-size`. On utilise uniquement :
- **Couleurs** : marqueurs `**`, `~~`, etc. en couleur atténuée, contenu formaté en couleur distincte
- **Backgrounds** : fond subtil pour `` `code` ``
- **text-decoration** : `line-through` pour `~~barré~~`
- **opacity** : marqueurs de syntaxe semi-transparents

## Changements

### `src/components/chat/InputMarkdownOverlay.tsx`
- Ajouter une fonction `renderInlineMarkdown(text: string)` qui parse le texte d'une ligne et retourne des `<span>` avec styles visuels :
  - `**bold**` → marqueurs `**` en `text-muted-foreground/50`, contenu en `text-[#FAA61A]` (doré)
  - `*italic*` → marqueurs en muted, contenu en `text-[#3BA55C]`
  - `~~barré~~` → `line-through` + couleur atténuée
  - `` `code` `` → fond `bg-muted/30` arrondi
  - `||spoiler||` → fond `bg-muted/50`
  - `[texte](url)` → texte en `text-primary`, url en muted
- Appeler `renderInlineMarkdown` sur chaque ligne au lieu de rendre le texte brut
- Le textarea reste `text-transparent` dès que du markdown est détecté (comportement actuel conservé)

### `src/components/account-settings/ProfileSettingsTab.tsx`
- Supprimer l'import et l'utilisation de `MarkdownPreview`
- Supprimer la ligne `{hasBioMarkdown && <MarkdownPreview content={formData.bio} />}`

### `src/components/profile/ServerProfileEditModal.tsx`
- Même suppression de `MarkdownPreview`

Le rendu se fait désormais directement dans l'overlay, pas dans une box séparée.

