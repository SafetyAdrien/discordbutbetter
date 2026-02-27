

# Corrections du markdown dans l'input et les messages

## 3 problemes identifies

### 1. Separateurs des titres/sous-titres peu visibles dans les messages envoyes

**Fichier** : `src/lib/markdown.tsx` (fonction `renderBlockToken`)

Les `<hr>` actuels utilisent `border-border` qui est tres discret. Modifications :
- Headers (`h1`, `h2`, `h3`) : remplacer `border-t border-border` par une bordure plus visible avec opacite accrue (`border-t border-[#3f4147]`) et un espacement plus coherent
- Subtext : meme amelioration pour le separateur au-dessus

### 2. Zone de texte decalee par rapport a l'overlay

**Fichier** : `src/components/chat/MessageInput.tsx`

Le probleme vient du fait que l'overlay (`absolute inset-0`) et le textarea n'ont pas les memes paddings horizontaux. L'overlay n'a aucun `px` alors que le textarea est dans un flex avec des boutons. Corrections :
- Ajouter des paddings identiques (`px-0`) explicitement aux deux couches
- S'assurer que le `adjustTextareaHeight` prend en compte la hauteur reelle de l'overlay (pas juste `scrollHeight` du textarea en `text-sm`)
- Utiliser un `ResizeObserver` sur l'overlay pour forcer la hauteur du textarea quand du markdown est actif

### 3. Autres markdowns a inclure dans l'overlay

**Fichier** : `src/components/chat/InputMarkdownOverlay.tsx`

Ajouter la detection et le rendu visuel dans l'overlay pour :
- **Blockquotes** (`>`) : afficher une bordure gauche coloree sur la ligne
- **Listes** (`-`, `*`, `1.`) : afficher le bullet/numero avec indentation
- **Code blocks** (` ``` `) : afficher un fond sombre sur le bloc

Ces elements ne changent pas la largeur du texte (contrairement au bold/italic), donc l'alignement textarea/overlay reste intact.

**Fichier** : `src/components/chat/InputMarkdownOverlay.tsx` - `parseLines()`

Etendre les types de lignes detectees :
```text
Types actuels : header1, header2, header3, subtext, normal
Nouveaux types : blockquote, listItem, orderedListItem, codeBlockLine
```

**Fichier** : `src/components/chat/InputMarkdownOverlay.tsx` - exports

Ajouter les `lineFontSizes` et `lineLineHeights` pour les nouveaux types (meme taille que `normal` car ces elements ne changent pas la taille de police).

**Fichier** : `src/components/chat/MessageInput.tsx`

Mettre a jour la condition `text-transparent` pour inclure les nouveaux types markdown (blockquotes, listes) en plus des headers.

---

## Details techniques

### Separateurs ameliores (markdown.tsx)

| Element | Avant | Apres |
|---------|-------|-------|
| Header HR | `border-t border-border mb-1` | `border-t border-[#3f4147] mb-2 mt-1` |
| Subtext HR | `border-t border-border mt-1` | `border-t border-[#3f4147] mt-2 mb-0.5` |

### Alignement textarea (MessageInput.tsx)

- Ajouter un `ref` au div de l'overlay pour observer sa hauteur
- Quand du markdown est detecte, forcer `textarea.style.height = overlay.scrollHeight + 'px'` via ResizeObserver
- Quand pas de markdown, revenir au comportement normal (`adjustTextareaHeight` standard)

### Nouveaux types dans l'overlay

| Syntaxe | Rendu dans l'overlay |
|---------|---------------------|
| `> texte` | Bordure gauche `border-l-4 border-[#4e5058] pl-3` + texte en `text-muted-foreground` |
| `- item` / `* item` | Bullet (`\u2022`) devant le texte |
| `1. item` | Numero devant le texte |
| ` ```code``` ` | Fond `bg-[#2b2d31]` avec police mono |

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/lib/markdown.tsx` | Separateurs plus visibles pour headers/subtext |
| `src/components/chat/InputMarkdownOverlay.tsx` | Ajouter blockquotes, listes, code blocks + corriger paddings |
| `src/components/chat/MessageInput.tsx` | Corriger alignement textarea/overlay, ResizeObserver, etendre condition text-transparent |

