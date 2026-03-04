

# Supprimer le système d'overlay Markdown du champ de saisie

## Problème

Le système actuel rend le texte du textarea transparent et superpose une couche avec coloration syntaxique (marqueurs `**`, `~~`, etc. atténués, contenu coloré). Le GIF Discord montre que le champ de saisie affiche simplement du texte brut sans aucun rendu Markdown en temps réel. Le Markdown n'est interprété qu'après l'envoi du message.

## Correction

### `src/components/chat/MessageInput.tsx`
- Supprimer l'import de `InputMarkdownOverlay`, `parseLines`, `hasInlineMarkdown`, et les constantes de font associées
- Supprimer le `useMemo` pour `hasMarkdown` et la ref `overlayRef`
- Supprimer le composant `<InputMarkdownOverlay>` du JSX
- Supprimer la logique `text-transparent caret-foreground` conditionnelle du textarea — le texte sera toujours `text-foreground`
- Supprimer la synchronisation du scroll de l'overlay dans `adjustTextareaHeight`
- Garder les constantes de style (`OVERLAY_FONT_SIZE`, etc.) si elles sont utilisées pour le textarea lui-même, sinon les remplacer par des valeurs directes

### `src/components/account-settings/ProfileSettingsTab.tsx`
- Supprimer l'import et l'utilisation de `InputMarkdownOverlay` dans l'éditeur de bio
- Supprimer la logique `text-transparent` conditionnelle du textarea de bio
- Le texte brut s'affiche normalement, le Markdown est rendu uniquement dans l'aperçu

### `src/components/profile/ServerProfileEditModal.tsx`
- Même traitement : supprimer l'overlay et la transparence du textarea de bio serveur

### `src/components/chat/InputMarkdownOverlay.tsx`
- Conserver le fichier car `parseLines` et `hasInlineMarkdown` pourraient être utilisés ailleurs, mais le composant `InputMarkdownOverlay` ne sera plus utilisé dans les inputs

