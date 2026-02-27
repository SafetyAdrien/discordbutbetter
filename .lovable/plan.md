

# Corriger le caret pour suivre la taille du markdown

## Probleme actuel

Le textarea est en `absolute inset-0` (changement non demande) et le caret ne suit pas la taille des headers. Un `<textarea>` HTML standard ne supporte pas les tailles de police variables par ligne.

## Solution

### 1. Revenir au layout original du textarea

**Fichier** : `src/components/chat/MessageInput.tsx`

- Remettre le textarea en flow normal (pas `absolute inset-0`)
- Remettre l'overlay en `absolute inset-0` derriere le textarea
- Restaurer le calcul dynamique de hauteur (`adjustTextareaHeight`) qui existait avant

### 2. Ajuster dynamiquement le font-size du textarea selon la ligne du curseur

**Fichier** : `src/components/chat/MessageInput.tsx`

- Ajouter un state `currentLineStyle` qui detecte sur quelle ligne se trouve le curseur
- Sur chaque `onSelect` / `onClick` / `onChange` du textarea, determiner la ligne courante et son type markdown
- Appliquer dynamiquement le `fontSize` du textarea pour correspondre au type de la ligne courante :
  - `# ` -> `text-2xl` (1.5rem)
  - `## ` -> `text-xl` (1.25rem)  
  - `### ` -> `text-lg` (1.125rem)
  - `-# ` -> `text-[12px]`
  - Normal -> `text-sm` (0.875rem)

Cela fait que le caret prend la hauteur de la ligne courante, meme si les autres lignes ont une taille differente visuellement (geree par l'overlay).

### 3. Ajuster la hauteur du textarea pour correspondre a l'overlay

**Fichier** : `src/components/chat/MessageInput.tsx`

- Utiliser un `useEffect` + `ResizeObserver` sur l'overlay pour synchroniser la hauteur du textarea avec celle de l'overlay
- Le textarea reste en flow normal mais sa hauteur est forcee pour correspondre au contenu rendu par l'overlay

### 4. Synchroniser le line-height entre overlay et textarea

**Fichier** : `src/components/chat/InputMarkdownOverlay.tsx`

- S'assurer que chaque type de ligne dans l'overlay utilise le meme `line-height` que le `fontSize` correspondant applique au textarea
- Mettre a jour les `leading-*` pour correspondre exactement

### Schema

```text
Quand le curseur est sur "# Titre" :
  - textarea font-size = 1.5rem (text-2xl) -> caret grand
  - overlay affiche "# Titre" en text-2xl  -> texte visible grand

Quand le curseur est sur "texte normal" :
  - textarea font-size = 0.875rem (text-sm) -> caret normal  
  - overlay affiche en text-transparent     -> texte invisible (textarea visible)
```

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/components/chat/MessageInput.tsx` | Revenir au layout normal, ajouter detection de ligne courante, ajuster fontSize dynamiquement, synchroniser hauteur avec overlay |
| `src/components/chat/InputMarkdownOverlay.tsx` | Aligner les line-heights avec les fontSize du textarea |

