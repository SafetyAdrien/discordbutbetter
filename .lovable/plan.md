

# Ajouter l'aperçu Markdown en direct (comme Discord)

## Problème
Le composant `MarkdownPreview` existe mais n'est utilisé nulle part. Quand l'utilisateur tape du Markdown dans le chat input ou les bios, aucun aperçu ne s'affiche. Discord affiche un aperçu rendu en direct sous le champ de saisie dès que du Markdown est détecté.

## Correction

### 1. `src/components/chat/MessageInput.tsx`
- Importer `MarkdownPreview` et `hasInlineMarkdown`/`parseLines` depuis `InputMarkdownOverlay`
- Ajouter un `useMemo` pour détecter si le contenu contient du Markdown (bloc ou inline)
- Afficher `<MarkdownPreview content={value} />` entre le formulaire et le `CreatePollModal`, uniquement quand du Markdown est détecté

### 2. `src/components/account-settings/ProfileSettingsTab.tsx`
- Importer `MarkdownPreview`
- Afficher `<MarkdownPreview content={formData.bio} />` sous le textarea de bio quand du Markdown est détecté

### 3. `src/components/profile/ServerProfileEditModal.tsx`
- Importer `MarkdownPreview`
- Afficher `<MarkdownPreview content={formData.bio} />` sous le textarea de bio serveur quand du Markdown est détecté

### 4. `src/components/chat/MarkdownPreview.tsx`
- Ajuster le style pour qu'il corresponde mieux au contexte Discord (pas de bordure superflue, intégration fluide)

