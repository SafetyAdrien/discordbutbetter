

# Restaurer l'overlay Markdown inline dans les champs de saisie

## Problème

L'utilisateur veut le système d'overlay original : le Markdown est rendu **directement dans le champ de saisie** (le texte brut devient transparent, une couche stylisée se superpose). Pas d'aperçu séparé. C'est exactement le composant `InputMarkdownOverlay` qui existait et a été retiré.

## Correction

### 1. `src/components/chat/MessageInput.tsx`
- Supprimer `<MarkdownPreview>` (ligne 538)
- Réimporter `InputMarkdownOverlay`, `parseLines`, `hasInlineMarkdown`, et les constantes de font
- Ajouter `overlayRef` et `hasMarkdown` via `useMemo`
- Rendre le textarea `text-transparent caret-foreground` quand du Markdown est détecté
- Placer `<InputMarkdownOverlay>` dans le conteneur du textarea (div relative ligne 478)
- Synchroniser le scroll de l'overlay avec le textarea dans `adjustTextareaHeight`

### 2. `src/components/account-settings/ProfileSettingsTab.tsx`
- Supprimer `<MarkdownPreview>` sous le textarea bio
- Ajouter `InputMarkdownOverlay` dans le conteneur bio avec la même logique (text-transparent conditionnel + overlay superposé)

### 3. `src/components/profile/ServerProfileEditModal.tsx`
- Même traitement que ProfileSettingsTab

### 4. `src/components/chat/MarkdownPreview.tsx`
- Conserver le fichier tel quel (peut servir ailleurs), mais ne plus l'utiliser dans les inputs

