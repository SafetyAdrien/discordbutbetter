

# Fix: Markdown dans les sections "À propos" des profils

## Problème identifié

**`FullUserProfileModal.tsx`** (le modal de profil complet) affiche la bio en texte brut sans aucun rendu Markdown :
```tsx
// Ligne 243-245 — pas de parseMarkdown, juste du texte brut
<p className="text-sm">
  {user.bio || "Aucune biographie définie."}
</p>
```

Alors que **`UserProfilePopup.tsx`** et **`ProfileSettingsTab.tsx`** utilisent correctement `parseMarkdown`.

## Changements

### `src/components/profile/FullUserProfileModal.tsx`
- Importer `parseMarkdown` depuis `@/lib/markdown`
- Remplacer le `<p>` brut par un `<div>` avec `parseMarkdown(user.bio)` et la classe `markdown-preview prose prose-invert prose-sm max-w-none`, cohérent avec le rendu dans `UserProfilePopup`
- Séparer le cas "bio vide" du cas "bio avec contenu" pour un rendu conditionnel propre

