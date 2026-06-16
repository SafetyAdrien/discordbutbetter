# Plan — Purge cache & ré-aligner les anciens messages

## Constat
- Le layout des messages est défini en JSX/CSS dans les composants (`ChatArea`, `DMConversation`, `ThreadView`, `AnnouncementChannel`). Le code mis à jour s'applique donc à TOUS les messages au prochain rendu, anciens comme nouveaux.
- Si certains "anciens messages" gardent visuellement un ancien layout, c'est parce que `src/lib/cache.ts` ressert des snapshots persistés (IndexedDB + miroir localStorage) hydratés AVANT que React ne re-render. Le mécanisme prévu pour ça est `CACHE_SCHEMA_VERSION` : à chaque incrément, `enforceCacheSchemaVersion()` purge memory + localStorage + IndexedDB au démarrage.
- Actuellement `CACHE_SCHEMA_VERSION = 5`. On l'incrémente pour forcer tous les clients à repartir de zéro.

## Changement
**Fichier:** `src/lib/cache.ts`
- Passer `CACHE_SCHEMA_VERSION` de `5` à `6`.

C'est tout. Au prochain chargement chez chaque utilisateur :
1. `warmCache()` détecte un schéma périmé.
2. `purgeAllCaches()` vide mémoire + miroir localStorage + IndexedDB.
3. Les hooks React Query refetch depuis Supabase.
4. Les messages sont rendus par le code à jour → layout unifié `-mx-4 pl-[21px] pr-8` partout, bordure jaune uniquement sur les mentions.

## Détails techniques
- Pas de migration de données : on n'altère ni la DB ni les schémas, on purge juste le cache client.
- Les sessions auth Supabase ne sont pas touchées (clés stockées sous un autre préfixe).
- Pas d'impact pour un utilisateur déjà sur la version 6 (no-op).

## Vérification
- Recharger l'app → DevTools → Application → IndexedDB `nexuschat-cache` doit être vide juste après le boot, puis se remplir avec les données récentes.
- Les anciens messages dans un salon textuel affichent le même alignement gauche/droite que les messages avec mention (sans la bordure jaune).
