

# Fix: Markdown editing et aperçu dans la Bio (Serveur/Défaut)

## Problèmes identifiés

1. **Détection inline manquante** : `hasBioMarkdown` utilise `parseLines()` qui ne détecte que le markdown de LIGNE (headers, blockquotes, listes). Le markdown inline (`**gras**`, `*italique*`, `` `code` ``, `~~barré~~`, `||spoiler||`) n'est PAS détecté. Résultat : le texte ne devient pas transparent et l'overlay ne s'active pas pour du contenu inline-only.

2. **Aucun aperçu du rendu final** : Pendant la rédaction, l'utilisateur ne voit que le texte brut avec les symboles markdown. Il n'y a aucun aperçu du rendu final en dessous du textarea.

## Solution

### 1. Ajouter la détection inline markdown

Créer une fonction `hasInlineMarkdown(content)` qui détecte les patterns inline : `**`, `*`, `__`, `~~`, `` ` ``, `||`, `[text](url)`. Combiner avec `parseLines` pour déterminer `hasBioMarkdown`.

### 2. Ajouter un aperçu Markdown live sous le textarea

Afficher un composant `MarkdownPreview` (qui existe déjà) sous le champ bio dès que du markdown est détecté. Cela montre le rendu final en temps réel pendant la rédaction.

### Fichiers modifiés

- **`src/components/chat/InputMarkdownOverlay.tsx`** : Exporter une nouvelle fonction `hasInlineMarkdown(content: string): boolean` qui teste les regex inline
- **`src/components/account-settings/ProfileSettingsTab.tsx`** : Utiliser la détection combinée pour `hasBioMarkdown`, ajouter `MarkdownPreview` sous le textarea
- **`src/components/profile/ServerProfileEditModal.tsx`** : Même traitement

### Détails techniques

```tsx
// Nouvelle fonction dans InputMarkdownOverlay.tsx
export function hasInlineMarkdown(content: string): boolean {
  if (!content) return false;
  return /(\*\*.+?\*\*|\*.+?\*|__.+?__|~~.+?~~|`.+?`|\|\|.+?\|\||\[.+?\]\(.+?\))/.test(content);
}

// Usage dans ProfileSettingsTab / ServerProfileEditModal
const hasBioMarkdown = useMemo(
  () => parseLines(formData.bio).some(l => l.type !== 'normal') || hasInlineMarkdown(formData.bio),
  [formData.bio]
);

// Aperçu sous le textarea
{hasBioMarkdown && <MarkdownPreview content={formData.bio} />}
```

