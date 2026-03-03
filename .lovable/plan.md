

# Correction des rendus Markdown

## Problèmes identifiés

### 1. Chat input (`MessageInput.tsx`) — détection inline manquante
La variable `hasMarkdown` (ligne 97) ne détecte que le markdown de bloc (headers, blockquotes, listes, code blocks). Le markdown inline (`**gras**`, `*italique*`, `__souligné__`, `[lien](url)`, `` `code` ``, `||spoiler||`, `~~barré~~`) n'est **pas** détecté. Résultat : le texte du textarea ne devient pas transparent quand on tape du markdown inline, ce qui provoque un chevauchement entre le texte brut et l'overlay.

**Correction** : Ajouter `hasInlineMarkdown(value)` à la condition, comme c'est déjà fait dans les bios.

### 2. Popup profil DM (`DMUserInfoPanel.tsx`) — bio en texte brut
La bio dans le panneau d'info DM (ligne 116) est rendue comme texte brut `{participant.bio}` sans appel à `parseMarkdown`. Le markdown n'est pas interprété.

**Correction** : Importer `parseMarkdown` et l'utiliser pour rendre la bio.

### 3. `InputMarkdownOverlay` — blockquote `>` sans espace
Dans `parseLines`, la détection des blockquotes exige `> ` (avec espace) ou `>>> `. Si l'utilisateur tape juste `>texte` (sans espace), ce n'est pas détecté comme blockquote dans l'overlay, alors que Discord le supporte.

**Correction** : Ajouter la détection de `>` suivi directement de texte (sans espace) comme blockquote.

## Fichiers modifiés

- **`src/components/chat/MessageInput.tsx`** : Importer `hasInlineMarkdown` et l'ajouter à la condition `hasMarkdown` → `parseLines(value).some(l => l.type !== 'normal') || hasInlineMarkdown(value)`
- **`src/components/dm/DMUserInfoPanel.tsx`** : Importer `parseMarkdown` et remplacer `{participant.bio}` par `{parseMarkdown(participant.bio)}`
- **`src/components/chat/InputMarkdownOverlay.tsx`** : Dans `parseLines`, ajouter la détection de `>` sans espace comme blockquote

