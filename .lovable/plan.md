

# Fix: Alignement Markdown overlay dans la bio

## Problème
L'overlay Markdown dans les textareas de bio ne s'aligne pas correctement avec le curseur/texte du textarea. Deux causes :

1. **Décalage de bordure** : Le textarea a une `border` de 1px qui décale son contenu, mais l'overlay (`absolute inset-0`) n'a pas de bordure, créant un décalage de 1px entre le texte overlay et le texte du textarea.
2. **Resize non instantané** : Le `autoResizeBio` est déclenché uniquement via `useEffect` (asynchrone), pas directement sur `onInput`, ce qui crée un léger décalage visuel lors de la frappe.

## Changements

### `src/components/chat/InputMarkdownOverlay.tsx`
- Ajouter `border border-transparent` au conteneur de l'overlay pour matcher la bordure du textarea et éliminer le décalage de 1px

### `src/components/account-settings/ProfileSettingsTab.tsx`
- Ajouter `onInput={autoResizeBio}` directement sur le textarea pour un resize instantané à chaque frappe

### `src/components/profile/ServerProfileEditModal.tsx`
- Même ajout de `onInput={autoResizeBio}` sur le textarea bio

