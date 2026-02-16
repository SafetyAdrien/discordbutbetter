

# Correctifs duplication de salon

## Problemes identifies

1. **Pas de mise a jour instantanee (optimistic update)** : la duplication attend la reponse serveur avant d'afficher le nouveau salon dans la liste
2. **`icon_url` non copie** : l'icone personnalisee du salon original n'est pas transferee au doublon
3. **Bug de decalage** : lignes 696-701, un premier `update` ecrase toutes les positions a `newPosition` au lieu de les decaler -- ce `update` superflu doit etre supprime (le decalage individuel qui suit fait deja le travail)

## Modifications

### Fichier : `src/hooks/useChannels.ts` (useDuplicateChannel)

**A. Ajouter `icon_url` a l'insertion (ligne 746)**
- Ajouter `icon_url: original.icon_url` dans l'objet d'insertion du doublon

**B. Supprimer le premier update bugge (lignes 695-701)**
- Retirer le bloc `await supabase.from('channels').update({ position: newPosition })...` qui ecrase les positions au lieu de les incrementer

**C. Ajouter un `onMutate` pour la mise a jour optimiste**
- Annuler les queries en cours (`channels`, `servers`)
- Sauvegarder le cache actuel
- Inserer un salon temporaire (avec un ID genere) dans le cache a la bonne position
- Decaler les positions des salons suivants dans le cache
- Retourner le contexte pour rollback en cas d'erreur

**D. Ajouter un `onError` avec rollback**
- Restaurer les caches precedents si la mutation echoue

