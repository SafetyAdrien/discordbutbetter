

# Timestamps visibles au hover uniquement pour les messages enfants

## Contexte
- Les messages **parents** (avec auteur/avatar, `showAuthor=true`) affichent le timestamp à côté du nom — celui-ci reste **toujours visible**.
- Les messages **enfants** (groupés, `showAuthor=false`) affichent le timestamp dans la colonne gauche (ligne 1641-1658) — celui-ci doit être **masqué par défaut** et visible uniquement au **hover** du message.

## Changement

**`src/components/chat/ChatArea.tsx`** (lignes 1641-1645)

Sur le `<span>` du timestamp des messages enfants, ajouter `opacity-0 group-hover/message:opacity-100 transition-opacity` pour le masquer par défaut et l'afficher au hover.

Il faut aussi s'assurer que le conteneur du message a la classe `group/message` — vérifier le wrapper parent (vers ligne 1455-1465).

