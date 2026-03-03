

# Rendre le Markdown inline dans les champs bio (sans aperçu séparé)

## Problème
L'aperçu Markdown est affiché dans un bloc séparé sous le textarea. L'utilisateur veut que le Markdown soit rendu directement dans le champ de saisie, comme c'est déjà fait dans le `MessageInput` du chat.

## Approche
Réutiliser le pattern du `MessageInput` : superposer un `InputMarkdownOverlay` sur le `<Textarea>`, rendre le texte transparent quand du markdown est détecté, et synchroniser le scroll.

## Changements

### 1. `src/components/account-settings/ProfileSettingsTab.tsx`
- Importer `InputMarkdownOverlay`, `OVERLAY_FONT_SIZE`, `OVERLAY_LINE_HEIGHT`, `INPUT_FONT_FAMILY` depuis `@/components/chat/InputMarkdownOverlay`
- Ajouter un `useRef` pour l'overlay et le textarea de la bio
- Remplacer le `<Textarea>` par un wrapper `relative` contenant :
  - `<InputMarkdownOverlay content={formData.bio} />`
  - Un `<textarea>` avec `text-transparent caret-foreground` quand markdown détecté, sinon `text-foreground`
  - Synchronisation du scroll overlay
- **Supprimer** le bloc d'aperçu séparé (lignes 188-193)
- Garder le rendu `parseMarkdown` dans la card preview du haut (ligne 122) — c'est un aperçu du profil final, pas un aperçu d'édition

### 2. `src/components/profile/ServerProfileEditModal.tsx`
- Même pattern : importer `InputMarkdownOverlay` + constantes
- Ajouter refs pour overlay et textarea
- Wrapper le textarea bio avec l'overlay
- **Supprimer** le bloc d'aperçu séparé (lignes 231-238)

### Détection markdown
Utiliser le même mécanisme que `InputMarkdownOverlay` : si `parseLines(content)` retourne des lignes non-`normal`, le texte devient transparent et l'overlay s'affiche.

### Fichiers modifiés
- `src/components/account-settings/ProfileSettingsTab.tsx`
- `src/components/profile/ServerProfileEditModal.tsx`

