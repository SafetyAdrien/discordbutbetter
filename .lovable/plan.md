

# Aperçu Markdown en temps réel dans la box Bio

## Analyse
L'`InputMarkdownOverlay` actuel ne gère que les styles au niveau des lignes (headers, citations, listes) via des couleurs. Il ne rend pas le formatage inline (gras, italique, souligné, barré, liens, etc.) car il est impossible de rendre du HTML dans un `<textarea>` tout en gardant l'alignement des glyphes.

## Solution
Ajouter un **aperçu Markdown live** directement sous le textarea, dans le même conteneur "Bio". Cet aperçu utilise `parseMarkdown` (qui gère déjà tous les formats) et se met à jour instantanément à chaque frappe. Il ne s'affiche que lorsque du contenu est présent.

### Changements

**`src/components/account-settings/ProfileSettingsTab.tsx`**
- Importer `parseMarkdown` depuis `@/lib/markdown`
- Ajouter un bloc d'aperçu conditionnel juste après le `<textarea>`, dans le même `<div className="relative">` ou juste après
- L'aperçu montre le rendu Markdown complet avec la classe `markdown-preview` et un style visuel discret (fond légèrement différent, bordure subtile, label "Aperçu")
- N'apparaît que si `formData.bio` contient du texte

**`src/components/profile/ServerProfileEditModal.tsx`**
- Même ajout d'aperçu live sous le textarea bio

### Rendu de l'aperçu
```tsx
{formData.bio.trim() && (
  <div className="mt-1.5 bg-[#1e1f22] border border-border/50 rounded-md p-3 text-sm">
    <div className="text-xs text-muted-foreground mb-1.5 font-medium">Aperçu</div>
    <div className="text-foreground markdown-preview">
      {parseMarkdown(formData.bio)}
    </div>
  </div>
)}
```

### Fichiers modifiés
- `src/components/account-settings/ProfileSettingsTab.tsx`
- `src/components/profile/ServerProfileEditModal.tsx`

