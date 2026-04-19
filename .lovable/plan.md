

## Cause racine

Le code TypeScript et le schéma BDD sont **désynchronisés** :

| Code (`useServerAssets.ts`) | Colonne réelle BDD |
|---|---|
| `image_url` | `url` |
| `uploaded_by` | `creator_id` |

Conséquence :
1. **INSERT échoue** silencieusement (colonne `image_url`/`uploaded_by` inconnue) → la table reste vide
2. **SELECT** retourne bien les lignes mais `data.image_url` est `undefined` → images cassées
3. L'**optimistic update** affiche le blob 1s, puis l'invalidation refetch trouve 0 ligne → emoji/sticker disparaît

J'ai vérifié via `\d` :
- `server_emojis` : `id, server_id, name, url, creator_id, created_at`
- `server_stickers` : `id, server_id, name, description, url, creator_id, created_at`

Tables vides confirmées (0 lignes), alors qu'un fichier `NeriFR.png` est bien dans le storage `server-stickers`. L'upload storage passe (policy permissive), mais l'INSERT SQL échoue.

## Bug secondaire (storage RLS)

La policy `Admins can upload server emoji` contient un bug :
```sql
(s.id)::text = (storage.foldername(s.name))[1]
```
`s.name` = nom du serveur, pas le chemin du fichier. La policy admin est cassée. Pour les emojis, c'est la **seule** policy INSERT → upload impossible pour tout le monde. Pour les stickers, une policy permissive `Authenticated users can upload` sauve la mise.

## Solution

**Aligner le code sur le schéma BDD** (1 seul fichier modifié, 0 migration nécessaire).

Dans `src/hooks/useServerAssets.ts` :

1. **Interfaces** `ServerEmoji` / `ServerSticker` : renommer `image_url` → `url`
2. **`useUploadEmoji`** INSERT : `image_url` → `url`, `uploaded_by` → `creator_id`
3. **`useUploadSticker`** INSERT : `image_url` → `url`, `uploaded_by` → `creator_id`
4. **Optimistic updates** : `image_url: blobUrl` → `url: blobUrl`

Dans les composants consommateurs (3 fichiers) : remplacer `emoji.image_url` / `sticker.image_url` → `.url`
- `src/components/server-settings/EmojiManager.tsx` (1 occurrence)
- `src/components/server-settings/StickerManager.tsx` (1 occurrence)
- `src/components/chat/EmojiStickerPicker.tsx` (2 occurrences : emoji + sticker)
- `src/components/channels/MediaChannel.tsx` (à vérifier — pas concerné a priori)

## Bonus : corriger la policy storage emoji

Pour permettre l'upload d'emojis (actuellement impossible à cause du bug `s.name`), créer une migration qui :
- DROP la policy `Admins can upload server emoji` cassée
- CREATE une policy correcte utilisant `(storage.foldername(name))[1]` (la colonne `name` de `storage.objects`, pas `s.name`)
- Idem pour les policies UPDATE/DELETE qui ont la même erreur

OU plus simple et cohérent avec stickers : ajouter une policy permissive `Authenticated users can upload server emoji` (mais moins sécurisé — n'importe quel user pourrait polluer le bucket).

→ **Recommandation** : corriger proprement la policy avec `(storage.foldername(name))[1]`.

## Garantie « ne casse rien »

- Aucune modification du schéma BDD (juste alignement code↔BDD)
- Le seul ancien sticker existant (`Eva` du serveur 2c43d3...) avait peut-être été inséré avant la régression — vérifier qu'il s'affiche encore après le renommage `image_url`→`url` (oui, car la BDD a toujours `url`)
- Realtime, optimistic updates, cache, picker mobile/desktop : intacts

## Fichiers modifiés

- `src/hooks/useServerAssets.ts` (renommage `image_url`→`url`, `uploaded_by`→`creator_id` dans 4 endroits)
- `src/components/server-settings/EmojiManager.tsx` (1 occurrence)
- `src/components/server-settings/StickerManager.tsx` (1 occurrence)  
- `src/components/chat/EmojiStickerPicker.tsx` (2 occurrences)
- **Migration SQL** : corriger les 6 policies cassées sur `storage.objects` (upload/update/delete × emoji/sticker) en remplaçant `(storage.foldername(s.name))[1]` par `(storage.foldername(name))[1]`

## Résultat

- Ajout d'un emoji/sticker → persistance immédiate, plus de disparition après 1s
- Les emojis/stickers existants (Eva) continuent de s'afficher
- Upload d'emoji par les admins/owners enfin possible

