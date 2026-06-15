# Mini popup de duplication de salon

## Objectif
Quand l'utilisateur clique sur "Dupliquer" dans le menu contextuel d'un salon, afficher une petite popup permettant de modifier (ou non) le nom du nouveau salon avant la création.

## Comportement
- Pré-remplie avec `<nom original>` (sans suffixe — l'utilisateur décide).
- Champ texte avec focus auto + sélection du texte.
- Bouton **Dupliquer** (validation Enter) → lance la mutation avec le nom saisi.
- Bouton **Annuler** (Escape) → ferme sans rien faire.
- Validation : nom non vide, trim, max 100 caractères (cohérent avec les autres modaux salon).

## Fichiers à modifier

### 1. `src/components/modals/DuplicateChannelModal.tsx` (nouveau)
Petit composant Dialog (shadcn) inspiré de `EditCategoryModal` / `CreateChannelModal` :
- Props : `open`, `onOpenChange`, `defaultName`, `onConfirm(name)`, `isPending`.
- Un seul `Input` + footer 2 boutons.
- Tokens sémantiques uniquement, pas de couleurs custom.

### 2. `src/hooks/useChannels.ts` — `useDuplicateChannel`
Ajouter un paramètre optionnel `name?: string` à la mutation. Si fourni et non vide, il remplace `original.name` dans l'`insert`. Sinon comportement actuel inchangé.

### 3. `src/components/layout/ChannelList.tsx`
- Nouvel état local : `duplicateTarget: { id: string; name: string } | null`.
- `handleDuplicateChannel(id)` : au lieu d'appeler directement la mutation, ouvre la popup en stockant l'id + nom courant.
- Au confirm de la popup : appelle `duplicateChannel.mutate({ channelId, serverId, name })` puis ferme.
- Monter `<DuplicateChannelModal />` une fois en bas du composant.

## Aucun changement
- Pas de migration DB.
- Pas de modification de la logique de positionnement, des overrides de permissions, ni des invalidations de cache.
- Pas de nouveau raccourci clavier global.
