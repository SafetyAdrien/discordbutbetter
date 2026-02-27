

# Corriger l'alignement de l'overlay markdown dans l'input

## Probleme

Actuellement, le `textarea` controle la hauteur du conteneur (flow normal) et l'overlay est en `absolute inset-0`. Le probleme : le textarea calcule sa hauteur avec `text-sm` uniforme, mais l'overlay affiche des titres en `text-2xl`. Le curseur et le texte ne sont donc pas alignes avec le rendu visuel.

## Solution

Inverser les roles : l'overlay doit controler la hauteur (flow normal), et le textarea doit etre en position absolue pour s'etirer sur toute la surface.

### Fichier : `src/components/chat/InputMarkdownOverlay.tsx`

- Retirer `absolute inset-0 pointer-events-none` et le remplacer par un div en flow normal qui definit la hauteur du conteneur
- Garder `pointer-events-none` et `aria-hidden`
- Ajouter `min-h-[24px]` pour correspondre au min-height du textarea
- Ajouter `overflow-y: auto` en masquant le scrollbar pour que le conteneur grandisse avec le contenu

### Fichier : `src/components/chat/MessageInput.tsx`

- Modifier le textarea pour etre en `absolute inset-0 w-full h-full` au lieu du flow normal
- Retirer `adjustTextareaHeight` car la hauteur est maintenant geree par l'overlay
- Ajouter un listener `onScroll` sur le conteneur pour synchroniser le scroll entre textarea et overlay
- Limiter le conteneur avec `max-h-[200px]` (ou 120px en compact) et `overflow-y: auto`

### Schema du nouveau layout

```text
+-- Container (relative, max-h-200px, overflow-y-auto) --+
|                                                          |
|  [Overlay div - flow normal, controle la hauteur]       |
|    # Titre  -> text-2xl -> hauteur plus grande          |
|    texte    -> text-sm   -> hauteur normale             |
|                                                          |
|  [Textarea - absolute inset-0, s'etire sur tout]        |
|    text-transparent, caret visible                       |
|                                                          |
+----------------------------------------------------------+
```

### Details techniques

1. L'overlay passe de `absolute inset-0` a `relative` (flow normal)
2. Le textarea passe de flow normal a `absolute inset-0`
3. Le conteneur `.relative` recoit `max-h-[200px] overflow-y-auto`
4. Suppression de `adjustTextareaHeight` (plus besoin, le conteneur suit l'overlay)
5. Les `min-h`, `max-h`, `py`, et `text-sm` de base restent identiques sur les deux couches pour l'alignement du texte normal

