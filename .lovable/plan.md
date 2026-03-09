

# Réduire le spacing des textes de messages (Discord-like)

## Analyse

Actuellement, le texte des messages a un line-height par défaut du navigateur (~1.5) et le conteneur `.markdown-content` n'a pas de `leading-` défini. Discord utilise un `line-height` serré de ~1.375rem (22px sur 16px) pour le texte des messages.

## Changements

### 1. `src/components/chat/ChatArea.tsx`
- Sur les `<p>` contenant le texte des messages (lignes 1593 et 1712), ajouter `leading-[1.375rem]` pour un interligne plus compact, style Discord.
- Réduire le padding du conteneur message : `pb-2` → `pb-1` (lignes 1461) et `pt-2` → `pt-1.5` pour les messages avec auteur.

### 2. `src/index.css`
- Ajouter une règle globale `.markdown-content` avec `line-height: 1.375rem` pour que tout le contenu markdown hérite de cet interligne serré.

### 3. `src/lib/markdown.tsx`
- Réduire les marges des headers : `my-2` → `my-1`, `my-1.5` → `my-1`, `my-1` → `my-0.5`
- Réduire les marges des blockquotes et listes : `my-1` → `my-0.5`

Résultat : texte plus compact et dense, fidèle au rendu Discord.

