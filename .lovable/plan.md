

# Fix: Texte bio invisible

## Problème
La classe `text-transparent` est appliquée dès que `formData.bio` contient du texte (`formData.bio && "text-transparent caret-foreground"`). Mais l'`InputMarkdownOverlay` ne s'affiche que quand du markdown est détecté (headers, listes, etc.). Résultat : le texte normal devient invisible sans overlay pour le remplacer.

## Solution
Conditionner `text-transparent` sur la **présence réelle de markdown**, pas sur la présence de texte.

### Changements

**`src/components/account-settings/ProfileSettingsTab.tsx`**
- Importer `parseLines` depuis `InputMarkdownOverlay` (ou utiliser un `useMemo` pour détecter le markdown)
- Ajouter : `const hasBioMarkdown = useMemo(() => parseLines(formData.bio).some(l => l.type !== 'normal'), [formData.bio])`
- Remplacer `formData.bio && "text-transparent caret-foreground"` par `hasBioMarkdown && "text-transparent caret-foreground"`

**`src/components/profile/ServerProfileEditModal.tsx`**
- Même correction : conditionner `text-transparent` sur la détection de markdown, pas sur la présence de texte

**`src/components/chat/InputMarkdownOverlay.tsx`**
- Exporter la fonction `parseLines` pour pouvoir la réutiliser dans les composants bio

