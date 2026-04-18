

## Diagnostic

Dans `src/components/chat/ChatArea.tsx`, l'affichage des réactions sous les messages textuels est cassé :

1. **Données erronées** : Les blocs aux lignes 1611 et 1730 utilisent `message.reactions` (champ statique du type `Message`, jamais hydraté en realtime) au lieu de `reactionsData[message.id]` qui vient de `useMessageReactions(messageIds)` (lignes 501-502).
2. **Boutons inertes** : Aucun `onClick` n'est attaché → impossible d'ajouter/retirer une réaction en cliquant sur un pill existant.
3. **Pas de highlight utilisateur** : Le style `userHasReacted` (anneau primary) ne s'applique pas.
4. **Duplication** : Logique dupliquée pour message avec en-tête vs message groupé, avec rendu manuel obsolète.

Le composant `MessageReactions` défini en local (ligne 114) n'est appelé nulle part — code mort. Et le composant unifié `ReactionBar` (déjà créé pour DM/Threads/Media) n'est pas utilisé ici.

Les **autres surfaces fonctionnent** (DM, Threads, Media, commentaires d'annonces) car elles utilisent déjà `<ReactionBar>` avec les bonnes données.

## Solution

Remplacer aux **deux** emplacements (lignes 1611-1623 et 1730-1742) l'affichage manuel par `<ReactionBar>` :

```tsx
{(reactionsData?.[message.id]?.length ?? 0) > 0 && (
  <div className="mt-1">
    <ReactionBar
      reactions={reactionsData?.[message.id] || []}
      onToggle={(emoji) => handleAddReaction(message.id, emoji)}
      serverId={serverId}
      showAddButton={false}
      size="sm"
    />
  </div>
)}
```

- `handleAddReaction` existe déjà ligne 819 (toggle add/remove).
- `serverId` est disponible dans le scope de `ChatArea`.
- `showAddButton={false}` — l'ajout passe par le bouton "+" du hover bar / context menu existants.
- Supprimer le composant mort `MessageReactions` (lignes 113-164) pour propreté.

Ajouter l'import `ReactionBar` en haut du fichier.

## Fichier modifié
- `src/components/chat/ChatArea.tsx` — remplacer 2 blocs d'affichage de réactions, supprimer `MessageReactions` mort, ajouter import.

## Résultat
Les réactions apparaîtront correctement sous chaque message textuel, cliquables pour toggle, avec highlight si l'utilisateur a réagi, et synchronisées en temps réel — cohérent avec DM/Threads/Media.

