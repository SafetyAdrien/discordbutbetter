

# Suppression du fond sous le ChatInput + Marge de séparation

## Changements

### `src/components/chat/ChatArea.tsx` (ligne 1815)
- **Supprimer** le background `bg-[hsl(var(--surface-2)/0.5)]` et le `border-t border-border/20` du container de l'input
- **Ajouter** un padding (`px-4 pb-4 pt-2`) pour créer une marge entre les messages et l'input, le tout sur fond transparent

### `src/components/chat/MessageInput.tsx`
- L'input lui-même conserve son propre fond (`bg-input`) et ses bordures — il "flotte" déjà visuellement grâce à son élévation et ses bordures

## Résultat
Le ChatInput flotte directement sur le fond principal sans couche intermédiaire colorée, avec un espace clair entre le dernier message et la zone de saisie.

